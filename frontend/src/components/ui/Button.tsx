import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'white' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-2 font-heading font-semibold rounded-input transition-all duration-200 select-none min-h-[44px] whitespace-nowrap focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    primary:
      'bg-teal hover:bg-teal-600 text-white shadow-soft hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0',
    secondary:
      'bg-deep-teal text-white shadow-soft hover:bg-ink hover:-translate-y-0.5',
    white:
      'bg-white text-deep-teal hover:bg-mint hover:text-deep-teal shadow-lift hover:-translate-y-0.5 font-bold',
    glass:
      'bg-white/15 text-white border border-white/35 hover:bg-white/25 backdrop-blur-md shadow-sm hover:-translate-y-0.5',
    outline:
      'bg-white text-ink border border-line hover:border-teal hover:text-teal shadow-sm',
    ghost:
      'bg-transparent text-ink hover:bg-teal/10 hover:text-teal',
    danger:
      'bg-coral text-white shadow-soft hover:bg-[#c0442b] hover:-translate-y-0.5',
  };

  const sizes = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-7 py-3.5 text-lg',
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...(props as any)}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </motion.button>
  );
};
