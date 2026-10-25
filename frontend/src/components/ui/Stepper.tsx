import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface StepperProps {
  steps: { id: number; label: string; subtitle?: string }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onStepClick }) => {
  const progress = ((currentStep - 1) / Math.max(1, steps.length - 1)) * 100;

  return (
    <div className="w-full">
      <div className="relative flex items-center justify-between">
        {/* Background track */}
        <div className="absolute left-0 top-5 w-full h-1 bg-line rounded-full -z-0" />
        {/* Animated teal fill */}
        <motion.div
          className="absolute left-0 top-5 h-1 bg-teal rounded-full -z-0"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />

        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          return (
            <button
              key={step.id}
              type="button"
              disabled={!onStepClick || step.id > currentStep}
              onClick={() => onStepClick?.(step.id)}
              className="relative z-10 flex flex-col items-center group focus:outline-none"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-heading font-bold text-sm transition-all duration-300 border-2 ${
                  isCompleted
                    ? 'bg-teal border-teal text-white shadow-sm'
                    : isCurrent
                    ? 'bg-deep-teal border-teal text-white ring-4 ring-teal/20 scale-105'
                    : 'bg-white border-line text-muted'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <span
                className={`mt-2 text-xs font-semibold ${
                  isCurrent ? 'text-deep-teal' : isCompleted ? 'text-teal' : 'text-muted'
                }`}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
