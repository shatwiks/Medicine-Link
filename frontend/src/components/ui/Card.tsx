import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'flat' | 'glass' | 'bento' | 'dark';
  hoverLift?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'flat',
  hoverLift = false,
  className = '',
  onClick,
}) => {
  const variants = {
    flat: 'bg-card border border-line/80 shadow-soft',
    glass: 'glass-nav border border-white/60 shadow-soft',
    bento: 'bg-card border border-line/90 shadow-soft relative overflow-hidden',
    dark: 'bg-deep-teal text-white border border-white/10 shadow-lift',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-card p-6 transition-all duration-300 ${variants[variant]} ${
        hoverLift ? 'hover:-translate-y-1 hover:shadow-lift' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
