'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation } from 'motion/react';

/**
 * Live crescent — the moon brightens every time the fund total increases.
 * Pass the latest total via `value`; when it grows, a 1.6 s "shine" pulse
 * fires (halo brightens + scales). Idle state still has a subtle ambient
 * glow so the icon never feels dead.
 *
 * Use on the dashboard fund card, or anywhere the live total is shown.
 */
interface Props {
  value: number;
  size?: number;
  className?: string;
}

export function BrightCrescent({ value, size = 96, className }: Props) {
  const prevRef = useRef(value);
  const halo = useAnimation();
  const moon = useAnimation();
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    if (value > prevRef.current) {
      setPulsing(true);
      halo.start({
        opacity: [0.25, 0.9, 0.35],
        scale: [1, 1.18, 1.04],
        transition: { duration: 1.6, ease: 'easeOut' },
      });
      moon.start({
        filter: ['brightness(1)', 'brightness(1.6)', 'brightness(1.08)'],
        transition: { duration: 1.6, ease: 'easeOut' },
      });
      const t = setTimeout(() => setPulsing(false), 1700);
      return () => clearTimeout(t);
    }
    prevRef.current = value;
  }, [value, halo, moon]);

  return (
    <div className={className} style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true">
        <defs>
          <radialGradient id="bc-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(235,231,221,0.85)" />
            <stop offset="55%" stopColor="rgba(235,231,221,0.30)" />
            <stop offset="100%" stopColor="rgba(235,231,221,0)" />
          </radialGradient>
          <linearGradient id="bc-moon" x1="15%" y1="20%" x2="85%" y2="80%">
            <stop offset="0%" stopColor="#ebe7dd" />
            <stop offset="50%" stopColor="#d6d2c7" />
            <stop offset="100%" stopColor="#9c9588" />
          </linearGradient>
          <mask id="bc-crmask">
            <rect width="128" height="128" fill="black" />
            <circle cx="60" cy="64" r="50" fill="white" />
            <circle cx="82" cy="56" r="44" fill="black" />
          </mask>
        </defs>

        {/* Ambient halo — always faintly glowing */}
        <motion.circle
          cx="60"
          cy="64"
          r="55"
          fill="url(#bc-halo)"
          initial={{ opacity: 0.3, scale: 1.02 }}
          animate={halo}
          style={{ transformOrigin: '60px 64px' }}
        />

        {/* Crescent — brightens on donation */}
        <motion.g
          animate={moon}
          style={{ originX: '0.47', originY: '0.5' }}
        >
          <circle cx="60" cy="64" r="50" fill="url(#bc-moon)" mask="url(#bc-crmask)" />
        </motion.g>
      </svg>
      {pulsing && (
        <span className="sr-only" aria-live="polite">New donation — crescent brightened</span>
      )}
    </div>
  );
}
