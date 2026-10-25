import React, { useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

export const FloatingPillsHero: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const yFast = useTransform(scrollY, [0, 600], [0, prefersReducedMotion ? 0 : -90]);
  const yMedium = useTransform(scrollY, [0, 600], [0, prefersReducedMotion ? 0 : -50]);
  const ySlow = useTransform(scrollY, [0, 600], [0, prefersReducedMotion ? 0 : -25]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((e.clientX - rect.left) / rect.width - 0.5) * 28,
      y: ((e.clientY - rect.top) / rect.height - 0.5) * 28,
    });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="absolute inset-0 overflow-hidden pointer-events-auto"
      aria-hidden="true"
    >
      {/* Blurred mesh blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal/25 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[28rem] h-[28rem] rounded-full bg-mint/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-80 h-80 rounded-full bg-teal-400/20 blur-3xl pointer-events-none" />

      {/* Pill 1: Top-left 3D Capsule */}
      <motion.div
        style={{ y: yFast }}
        animate={{ x: mouse.x * -0.8, y: mouse.y * -0.8 }}
        transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        className="hidden sm:block absolute top-16 left-[6%] opacity-85"
      >
        <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
          <defs>
            <linearGradient id="capTeal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6FD3BD" />
              <stop offset="100%" stopColor="#1B9C85" />
            </linearGradient>
            <linearGradient id="capWhite" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#DDE5E1" />
            </linearGradient>
          </defs>
          <g transform="rotate(-32 48 48)">
            <rect x="30" y="14" width="36" height="34" rx="18" fill="url(#capTeal)" />
            <rect x="30" y="44" width="36" height="38" rx="18" fill="url(#capWhite)" />
            <rect x="30" y="42" width="36" height="5" fill="#0F2F2E" fillOpacity="0.18" />
            <ellipse cx="41" cy="28" rx="4" ry="9" fill="white" fillOpacity="0.45" />
          </g>
        </svg>
      </motion.div>

      {/* Pill 2: Scored Round Tablet */}
      <motion.div
        style={{ y: yMedium }}
        animate={{ x: mouse.x * 0.6, y: mouse.y * 0.6 }}
        transition={{ type: 'spring', stiffness: 70, damping: 18 }}
        className="hidden md:block absolute bottom-20 left-[12%] opacity-80"
      >
        <svg width="76" height="76" viewBox="0 0 76 76" fill="none">
          <circle cx="38" cy="38" r="28" fill="#FFFFFF" fillOpacity="0.9" />
          <circle cx="38" cy="38" r="24" stroke="#6FD3BD" strokeWidth="2" strokeOpacity="0.6" />
          <line x1="18" y1="38" x2="58" y2="38" stroke="#1B9C85" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* Pill 3: Blister Strip Pack top-right */}
      <motion.div
        style={{ y: ySlow }}
        animate={{ x: mouse.x * 1.1, y: mouse.y * -0.7 }}
        transition={{ type: 'spring', stiffness: 90, damping: 22 }}
        className="hidden lg:block absolute top-14 right-[42%] opacity-75"
      >
        <svg width="110" height="80" viewBox="0 0 110 80" fill="none">
          <rect
            x="10"
            y="10"
            width="90"
            height="60"
            rx="12"
            fill="#FFFFFF"
            fillOpacity="0.14"
            stroke="#6FD3BD"
            strokeOpacity="0.4"
            strokeWidth="1.5"
          />
          {[28, 55, 82].map((cx) =>
            [28, 52].map((cy) => (
              <circle
                key={`${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r="8"
                fill="#6FD3BD"
                fillOpacity="0.75"
              />
            ))
          )}
        </svg>
      </motion.div>

      {/* Pill 4: Shield + Cross Badge bottom-right */}
      <motion.div
        style={{ y: yFast }}
        animate={{ x: mouse.x * -0.5, y: mouse.y * 0.9 }}
        transition={{ type: 'spring', stiffness: 75, damping: 20 }}
        className="hidden sm:block absolute bottom-12 right-[6%] opacity-80"
      >
        <svg width="84" height="84" viewBox="0 0 84 84" fill="none">
          <path
            d="M42 10L68 21V41C68 58 56.8 70.6 42 75C27.2 70.6 16 58 16 41V21L42 10Z"
            fill="#1B9C85"
            fillOpacity="0.28"
            stroke="#6FD3BD"
            strokeWidth="2"
          />
          <path
            d="M33 42L39.5 48.5L52 35"
            stroke="#6FD3BD"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </div>
  );
};
