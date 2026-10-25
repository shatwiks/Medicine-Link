import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { ItemStatus } from '../../types';

const LIFECYCLE_STEPS = [
  { key: 'LISTED', label: 'Listed' },
  { key: 'PENDING_REVIEW', label: 'RPh Check' },
  { key: 'APPROVED', label: 'Verified' },
  { key: 'MATCHED', label: 'Matched' },
  { key: 'PICKUP_SCHEDULED', label: 'In Transit' },
  { key: 'RECEIVED', label: 'Received' },
];

const STATUS_INDEX: Record<ItemStatus, number> = {
  LISTED: 0,
  AUTO_BLOCKED: 1,
  PENDING_REVIEW: 1,
  REJECTED: 1,
  APPROVED: 2,
  MATCHED: 3,
  ACCEPTED: 3,
  PICKUP_SCHEDULED: 4,
  PICKED_UP: 4,
  DELIVERED: 4,
  RECEIVED: 5,
  CANCELLED: 0,
  EXPIRED: 2,
};

interface TimelineProps {
  status: ItemStatus;
  compact?: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({ status, compact = false }) => {
  const activeIdx = STATUS_INDEX[status] ?? 0;
  const isErrorState =
    status === 'AUTO_BLOCKED' || status === 'REJECTED' || status === 'CANCELLED' || status === 'EXPIRED';

  const progressPct = (activeIdx / (LIFECYCLE_STEPS.length - 1)) * 100;

  return (
    <div className="w-full py-2">
      <div className="relative flex items-center justify-between">
        <div className="absolute left-0 top-3.5 w-full h-1 bg-line rounded-full" />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`absolute left-0 top-3.5 h-1 rounded-full ${
            isErrorState ? 'bg-coral' : 'bg-teal'
          }`}
        />

        {LIFECYCLE_STEPS.map((step, idx) => {
          const isPast = idx < activeIdx || status === 'RECEIVED';
          const isCurrent = idx === activeIdx && status !== 'RECEIVED';
          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                  isCurrent && isErrorState
                    ? 'bg-coral border-coral text-white'
                    : isPast
                    ? 'bg-teal border-teal text-white'
                    : isCurrent
                    ? 'bg-white border-teal text-teal ring-4 ring-teal/20 animate-pulse'
                    : 'bg-white border-line text-muted'
                }`}
              >
                {isCurrent && isErrorState ? (
                  <X className="w-3.5 h-3.5" />
                ) : isPast ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
              {!compact && (
                <span
                  className={`mt-1.5 text-[11px] font-medium whitespace-nowrap ${
                    isCurrent
                      ? isErrorState
                        ? 'text-coral font-semibold'
                        : 'text-deep-teal font-semibold'
                      : isPast
                      ? 'text-ink'
                      : 'text-muted'
                  }`}
                >
                  {step.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
