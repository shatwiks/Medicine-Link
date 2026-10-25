import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { env } from '../../config/env';

export interface OcrExtractionResult {
  expiry_date: string | null;
  batch_no: string | null;
  medicine_name_guess: string | null;
  raw_text: string;
  confidence: number;
  fields_found: string[];
  message?: string;
}

export interface OcrProvider {
  recognizeImage(buffer: Buffer): Promise<OcrExtractionResult>;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function lastDayOfMonth(year: number, month1To12: number): string {
  const d = new Date(Date.UTC(year, month1To12, 0));
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function extractFieldsFromOcrText(rawText: string, confidence = 0.85): OcrExtractionResult {
  const fieldsFound: string[] = [];
  let expiryDate: string | null = null;
  let batchNo: string | null = null;
  let medicineGuess: string | null = null;

  // 1. Expiry extraction
  // Try DD/MM/YYYY after EXP
  const dmyMatch = rawText.match(
    /(?:exp(?:iry)?(?:\s*date)?|use\s*before)\s*[:.\-]?\s*(\d{2})[\/\-](\d{2})[\/\-](20\d{2})/i
  );
  if (dmyMatch) {
    const dd = dmyMatch[1];
    const mm = dmyMatch[2];
    const yyyy = dmyMatch[3];
    expiryDate = `${yyyy}-${mm}-${dd}`;
    fieldsFound.push('expiry_date');
  }

  // Try MM/YYYY or MM-YYYY or MM/YY
  if (!expiryDate) {
    const myMatch = rawText.match(
      /(?:exp(?:iry)?(?:\s*date)?|use\s*before)?\s*[:.\-]?\s*(0[1-9]|1[0-2])[\/\-](20\d{2}|\d{2})\b/i
    );
    if (myMatch) {
      const mm = Number(myMatch[1]);
      let yyyy = Number(myMatch[2]);
      if (yyyy < 100) yyyy += 2000;
      expiryDate = lastDayOfMonth(yyyy, mm);
      fieldsFound.push('expiry_date');
    }
  }

  // Try MMM YYYY (e.g. AUG 2027, Apr 28)
  if (!expiryDate) {
    const mmmMatch = rawText.match(
      /(?:exp(?:iry)?(?:\s*date)?|use\s*before)?\s*[:.\-]?\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\/\-]+(20\d{2}|\d{2})\b/i
    );
    if (mmmMatch) {
      const mm = MONTH_MAP[mmmMatch[1].toLowerCase().slice(0, 3)];
      let yyyy = Number(mmmMatch[2]);
      if (yyyy < 100) yyyy += 2000;
      if (mm) {
        expiryDate = lastDayOfMonth(yyyy, mm);
        fieldsFound.push('expiry_date');
      }
    }
  }

  // 2. Batch No extraction
  const batchMatch = rawText.match(
    /(?:b\.?\s*no\.?|batch(?:\s*no\.?)?|lot(?:\s*no\.?)?)\s*[:.\-]?\s*([A-Z0-9\-]{3,16})/i
  );
  if (batchMatch) {
    batchNo = batchMatch[1].toUpperCase();
    fieldsFound.push('batch_no');
  }

  // 3. Medicine name guess from known keywords or first uppercase line
  const knownMeds = [
    'Paracetamol',
    'Dolo 650',
    'Crocin',
    'Amoxicillin',
    'Mox 500',
    'Metformin',
    'Glycomet',
    'Cetirizine',
    'Zyrtec',
    'Azithromycin',
    'Azithral',
    'Pantoprazole',
    'Pan 40',
    'Omeprazole',
    'Ibuprofen',
    'Vitamin C',
    'Limcee',
  ];
  for (const med of knownMeds) {
    if (rawText.toLowerCase().includes(med.toLowerCase())) {
      medicineGuess = med;
      fieldsFound.push('medicine_name_guess');
      break;
    }
  }

  return {
    expiry_date: expiryDate,
    batch_no: batchNo,
    medicine_name_guess: medicineGuess,
    raw_text: rawText.trim(),
    confidence: Math.round(confidence * 100) / 100,
    fields_found: fieldsFound,
  };
}

export class TesseractOcrProvider implements OcrProvider {
  async recognizeImage(buffer: Buffer): Promise<OcrExtractionResult> {
    try {
      const cleanedBuffer = await sharp(buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .grayscale()
        .normalize()
        .toBuffer();

      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), env.OCR_TIMEOUT_MS)
      );

      const ocrPromise = Tesseract.recognize(cleanedBuffer, 'eng');
      const result = await Promise.race([ocrPromise, timeoutPromise]);

      if (!result) {
        return {
          expiry_date: null,
          batch_no: null,
          medicine_name_guess: null,
          raw_text: '',
          confidence: 0,
          fields_found: [],
          message: 'OCR timed out after 15 seconds. Please enter details manually.',
        };
      }

      const rawText = result.data?.text || '';
      const meanConf = (result.data?.confidence ?? 0) / 100;
      return extractFieldsFromOcrText(rawText, meanConf);
    } catch {
      return {
        expiry_date: null,
        batch_no: null,
        medicine_name_guess: null,
        raw_text: '',
        confidence: 0,
        fields_found: [],
        message: 'Could not read text from image automatically. Please enter fields manually.',
      };
    }
  }
}

export const defaultOcrProvider: OcrProvider = new TesseractOcrProvider();
