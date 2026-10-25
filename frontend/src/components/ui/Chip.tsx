import React from 'react';

interface ChipProps {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({ label, active = false, count, onClick, icon }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-pill text-sm font-medium transition-all duration-200 border ${
        active
          ? 'bg-deep-teal text-white border-deep-teal shadow-sm'
          : 'bg-white text-muted border-line hover:border-teal hover:text-ink'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`px-2 py-0.5 text-xs rounded-pill font-semibold ${
            active ? 'bg-teal text-white' : 'bg-surface text-ink'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};
