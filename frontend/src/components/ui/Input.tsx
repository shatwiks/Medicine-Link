import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  highlighted?: boolean;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  highlighted = false,
  helperText,
  value,
  id,
  className = '',
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const hasValue = value !== undefined && String(value).length > 0;

  return (
    <div className={`w-full ${error ? 'animate-shake' : ''} ${className}`}>
      <div className="relative">
        <input
          id={inputId}
          value={value}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholder=" "
          className={`peer w-full rounded-input bg-white px-4 pt-6 pb-2 text-base text-ink border transition-all duration-200 outline-none ${
            error
              ? 'border-coral bg-coral-light/30'
              : highlighted
              ? 'border-teal ring-2 ring-teal/20 bg-teal-50/40'
              : focused
              ? 'border-teal ring-2 ring-teal/15'
              : 'border-line hover:border-teal/50'
          }`}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={`pointer-events-none absolute left-4 transition-all duration-200 ${
            focused || hasValue || props.type === 'date'
              ? 'top-2 text-xs font-medium text-teal'
              : 'top-4 text-sm text-muted'
          }`}
        >
          {label}
          {highlighted && (
            <span className="ml-2 inline-block px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider bg-teal/15 text-teal rounded">
              OCR Detected
            </span>
          )}
        </label>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-coral">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-muted">{helperText}</p>}
    </div>
  );
};
