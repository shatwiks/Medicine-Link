import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-6 w-full' }) => {
  return (
    <div
      className={`rounded-input bg-gradient-to-r from-line/60 via-surface to-line/60 bg-[length:200%_100%] animate-shimmer ${className}`}
      aria-hidden="true"
    />
  );
};
