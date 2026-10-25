import React from 'react';

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  description?: string;
  onChange: (value: number) => void;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  description,
  onChange,
}) => {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-heading font-bold text-ink">{label}</label>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
        <span className="px-3 py-1 rounded-pill bg-teal-50 text-teal-700 font-heading font-bold text-sm border border-teal-200">
          {value} {unit}
        </span>
      </div>
      <div className="relative flex items-center pt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          style={{
            background: `linear-gradient(to right, #1B9C85 0%, #1B9C85 ${pct}%, #DDE5E1 ${pct}%, #DDE5E1 100%)`,
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-teal"
        />
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  );
};
