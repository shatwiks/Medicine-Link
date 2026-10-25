import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface ScanAnimationProps {
  isScanning: boolean;
  scannedData?: {
    medicine_name: string;
    batch_no: string;
    expiry_date: string;
    confidence: number;
  };
}

export const ScanAnimation: React.FC<ScanAnimationProps> = ({ isScanning, scannedData }) => {
  return (
    <div className="relative w-full rounded-card bg-deep-teal p-6 overflow-hidden border border-teal/40 shadow-lift">
      {/* Simulated Blister Strip Graphic */}
      <div className="relative mx-auto max-w-md rounded-xl bg-white/95 p-5 text-ink shadow-inner border border-line">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal">
               Blister Pack Preview
            </span>
            <h4 className="text-lg font-heading font-extrabold text-ink">
              {scannedData?.medicine_name || 'Dolo 650 (Paracetamol IP)'}
            </h4>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <span
                key={n}
                className="w-4 h-6 rounded-full bg-gradient-to-b from-teal-100 to-teal-300 border border-teal-400"
              />
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
          <motion.div
            animate={
              !isScanning && scannedData
                ? { scale: [0.95, 1.03, 1], borderColor: '#1B9C85' }
                : {}
            }
            className="p-2.5 rounded-lg border-2 border-dashed border-teal bg-teal-50/70"
          >
            <span className="block text-[10px] text-muted uppercase">Batch No.</span>
            <strong className="text-sm text-deep-teal">
              {scannedData?.batch_no || 'DL9920M'}
            </strong>
          </motion.div>

          <motion.div
            animate={
              !isScanning && scannedData
                ? { scale: [0.95, 1.03, 1], borderColor: '#1B9C85' }
                : {}
            }
            className="p-2.5 rounded-lg border-2 border-dashed border-teal bg-teal-50/70"
          >
            <span className="block text-[10px] text-muted uppercase">Expiry Date</span>
            <strong className="text-sm text-deep-teal">
              {scannedData?.expiry_date || '2028-04-30'}
            </strong>
          </motion.div>
        </div>

        {/* Sweeping laser scan line */}
        {isScanning && (
          <motion.div
            initial={{ top: '0%' }}
            animate={{ top: ['5%', '92%', '5%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-0 right-0 h-1 bg-teal shadow-[0_0_18px_4px_rgba(27,156,133,0.85)] z-20"
          />
        )}
      </div>

      {/* Status bar below pack */}
      <div className="mt-4 flex items-center justify-between text-xs text-white/90">
        {isScanning ? (
          <span className="inline-flex items-center gap-2 text-mint font-medium">
            <Sparkles className="w-4 h-4 animate-spin" />
            Running Sharp cleanup & Tesseract OCR extraction...
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-mint font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            OCR Extracted Batch & Expiry ({Math.round((scannedData?.confidence ?? 0.95) * 100)}% confidence)
          </span>
        )}
      </div>
    </div>
  );
};
