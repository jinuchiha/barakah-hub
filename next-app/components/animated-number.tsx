'use client';
import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatter?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, duration = 800, formatter, className }: AnimatedNumberProps) {
  const [displayed, setDisplayed] = useState(0);
  const startRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = startRef.current;
    const to = value;
    if (from === to) return;
    startTimeRef.current = null;

    const animate = (ts: number) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const elapsed = ts - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplayed(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        startRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const text = formatter ? formatter(displayed) : displayed.toLocaleString('en-PK');
  return <span className={className}>{text}</span>;
}
