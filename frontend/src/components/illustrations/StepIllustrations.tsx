import React from 'react';
import { motion } from 'framer-motion';

export const StepIllustration: React.FC<{ stepIndex: number }> = ({ stepIndex }) => {
  return (
    <div className="relative w-full h-72 sm:h-80 rounded-card bg-signature-gradient p-6 flex items-center justify-center overflow-hidden shadow-lift border border-white/15">
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-mint/20 blur-2xl" />
      <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-teal/30 blur-2xl" />

      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, scale: 0.92, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center text-center text-white"
      >
        {stepIndex === 0 && (
          <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
            <rect x="25" y="25" width="130" height="100" rx="16" fill="#FFFFFF" fillOpacity="0.14" stroke="#6FD3BD" strokeWidth="2" />
            <rect x="42" y="44" width="60" height="12" rx="6" fill="#6FD3BD" />
            <rect x="42" y="64" width="96" height="8" rx="4" fill="#FFFFFF" fillOpacity="0.6" />
            <rect x="42" y="80" width="76" height="8" rx="4" fill="#FFFFFF" fillOpacity="0.4" />
            <circle cx="128" cy="96" r="16" fill="#1B9C85" stroke="#6FD3BD" strokeWidth="2" />
            <path d="M128 89V103M121 96H135" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}

        {stepIndex === 1 && (
          <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
            <rect x="30" y="20" width="120" height="110" rx="14" fill="#0F2F2E" stroke="#6FD3BD" strokeWidth="2" />
            <rect x="46" y="42" width="88" height="22" rx="6" fill="#1B9C85" fillOpacity="0.3" stroke="#6FD3BD" strokeDasharray="4 4" />
            <text x="54" y="57" fill="#6FD3BD" fontSize="11" fontFamily="monospace" fontWeight="bold">EXP: 04/2028</text>
            <rect x="46" y="76" width="88" height="22" rx="6" fill="#1B9C85" fillOpacity="0.3" stroke="#6FD3BD" strokeDasharray="4 4" />
            <text x="54" y="91" fill="#FFFFFF" fontSize="11" fontFamily="monospace" fontWeight="bold">B.NO: DL8842K</text>
            <line x1="22" y1="68" x2="158" y2="68" stroke="#6FD3BD" strokeWidth="3" />
          </svg>
        )}

        {stepIndex === 2 && (
          <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
            <path d="M90 18L142 38V74C142 106 119 127 90 136C61 127 38 106 38 74V38L90 18Z" fill="#1B9C85" fillOpacity="0.35" stroke="#6FD3BD" strokeWidth="2.5" />
            <path d="M70 76L84 90L112 60" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}

        {stepIndex === 3 && (
          <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
            <circle cx="52" cy="75" r="26" fill="#FFFFFF" fillOpacity="0.16" stroke="#6FD3BD" strokeWidth="2" />
            <circle cx="128" cy="75" r="26" fill="#1B9C85" stroke="#6FD3BD" strokeWidth="2" />
            <path d="M78 75H102" stroke="#6FD3BD" strokeWidth="3" strokeDasharray="4 4" />
            <text x="41" y="79" fill="white" fontSize="11" fontWeight="bold">PACK</text>
            <text x="115" y="79" fill="white" fontSize="11" fontWeight="bold">98%</text>
          </svg>
        )}

        {stepIndex === 4 && (
          <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
            <rect x="24" y="48" width="82" height="52" rx="10" fill="#FFFFFF" fillOpacity="0.18" stroke="#6FD3BD" strokeWidth="2" />
            <path d="M106 62H134L148 80V100H106V62Z" fill="#1B9C85" stroke="#6FD3BD" strokeWidth="2" />
            <circle cx="52" cy="104" r="12" fill="#0F2F2E" stroke="#6FD3BD" strokeWidth="3" />
            <circle cx="128" cy="104" r="12" fill="#0F2F2E" stroke="#6FD3BD" strokeWidth="3" />
          </svg>
        )}

        {stepIndex === 5 && (
          <svg width="180" height="150" viewBox="0 0 180 150" fill="none">
            <circle cx="90" cy="75" r="46" fill="#6FD3BD" fillOpacity="0.22" stroke="#6FD3BD" strokeWidth="2.5" />
            <path d="M90 50C82 40 66 42 66 56C66 72 90 88 90 96C90 88 114 72 114 56C114 42 98 40 90 50Z" fill="#6FD3BD" />
          </svg>
        )}
      </motion.div>
    </div>
  );
};
