import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

const uploadDir = path.resolve(env.UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const uploadPhotoMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
  },
}).single('photo');

export function validateAndSavePhotoBuffer(buffer: Buffer): {
  filePath: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
} {
  // Check file magic bytes (JPEG, PNG, WebP)
  let mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | null = null;
  let ext = '.jpg';

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    mimeType = 'image/jpeg';
    ext = '.jpg';
  } else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    mimeType = 'image/png';
    ext = '.png';
  } else if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    mimeType = 'image/webp';
    ext = '.webp';
  }

  if (!mimeType) {
    throw new AppError(
      415,
      'UNSUPPORTED_FILE',
      'Only valid JPEG, PNG, or WebP images are allowed'
    );
  }

  const randomName = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.join(uploadDir, randomName);
  fs.writeFileSync(fullPath, buffer);

  return {
    filePath: `/uploads/${randomName}`,
    mimeType,
    sizeBytes: buffer.length,
  };
}
