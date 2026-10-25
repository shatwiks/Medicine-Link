import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div
      role="region"
      aria-label="Educational prototype disclaimer"
      className="w-full bg-deep-teal text-white border-b border-white/10 px-4 py-1.5 text-center text-xs font-medium flex items-center justify-center gap-2 z-50"
    >
      <ShieldAlert className="w-3.5 h-3.5 text-amber shrink-0" />
      <span>
        <strong className="text-mint font-semibold">Prototype for educational purposes.</strong> Do not use for real medicines. Dummy data only.
      </span>
    </div>
  );
};
