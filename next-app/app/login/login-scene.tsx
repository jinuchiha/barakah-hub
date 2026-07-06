'use client';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { BarakahFieldMount } from '@/components/barakah-field-mount';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Deterministic ember field — SSR-safe (no Math.random). */
const EMBERS = [
  { left: '8%', size: 3, delay: '0s', duration: '14s', o: 0.5 },
  { left: '18%', size: 2, delay: '-4s', duration: '17s', o: 0.35 },
  { left: '27%', size: 4, delay: '-9s', duration: '12s', o: 0.45 },
  { left: '38%', size: 2, delay: '-2s', duration: '19s', o: 0.3 },
  { left: '47%', size: 3, delay: '-12s', duration: '15s', o: 0.5 },
  { left: '57%', size: 2, delay: '-6s', duration: '18s', o: 0.35 },
  { left: '66%', size: 4, delay: '-15s', duration: '13s', o: 0.45 },
  { left: '74%', size: 2, delay: '-1s', duration: '20s', o: 0.3 },
  { left: '83%', size: 3, delay: '-8s', duration: '16s', o: 0.5 },
  { left: '92%', size: 2, delay: '-11s', duration: '14s', o: 0.35 },
] as const;

/** Ghost haroof drifting behind the card — the "you have arrived" layer. */
const HAROOF = [
  { text: 'ب', top: '6%', left: '10%', size: '16rem', duration: '46s', delay: '0s' },
  { text: 'ر', top: '52%', left: '78%', size: '14rem', duration: '58s', delay: '-20s' },
  { text: 'ك', top: '66%', left: '6%', size: '12rem', duration: '52s', delay: '-35s' },
  { text: 'ة', top: '12%', left: '72%', size: '10rem', duration: '62s', delay: '-12s' },
] as const;

/** Astrolabe-style rosette — concentric rings + hour ticks, unambiguous. */
function Astrolabe({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const ticks = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.4" />
      <circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="0.3" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.25" />
      {ticks.map((a) => (
        <line key={a} x1="50" y1="4" x2="50" y2="9" stroke="currentColor" strokeWidth="0.35" transform={`rotate(${a} 50 50)`} />
      ))}
    </svg>
  );
}

function TiltCard({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [2.5, -2.5]), { stiffness: 180, damping: 26 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-2.5, 2.5]), { stiffness: 180, damping: 26 });

  return (
    <motion.div
      onPointerMove={(e) => {
        if (reduce || e.pointerType === 'touch') return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
      style={{ rotateX: reduce ? 0 : rotateX, rotateY: reduce ? 0 : rotateY, transformPerspective: 1100 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Login "noor" scene — bismillah writes itself right-to-left, a gold
 * hairline grows beneath it, then the card surfaces out of a blur while
 * ghost haroof, embers, and star geometry drift behind. Everything is
 * deterministic, CSS/spring driven, and collapses to a static layout
 * under prefers-reduced-motion.
 */
export default function LoginScene({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative z-10 grid min-h-screen place-items-center p-5">
      {/* Depth layers */}
      <BarakahFieldMount />
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Astrolabe
          className="star-spin absolute text-[var(--color-gold)]"
          style={{ width: '52rem', height: '52rem', top: '-20rem', right: '-18rem', opacity: 0.05 }}
        />
        <Astrolabe
          className="star-spin-reverse absolute text-[var(--color-gold)]"
          style={{ width: '36rem', height: '36rem', bottom: '-14rem', left: '-12rem', opacity: 0.04 }}
        />
        {HAROOF.map((h) => (
          <span
            key={h.text}
            className="calligraphy-word font-[var(--font-arabic)]"
            style={{ top: h.top, left: h.left, fontSize: h.size, animationDuration: h.duration, animationDelay: h.delay }}
          >
            {h.text}
          </span>
        ))}
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="ember"
            style={{
              left: e.left,
              width: e.size,
              height: e.size,
              animationDelay: e.delay,
              animationDuration: e.duration,
              ['--ember-o' as string]: e.o,
            }}
          />
        ))}
      </div>

      <div className="w-[420px] max-w-full">
        {/* Bismillah writes itself, then the hairline draws outward */}
        <div className="mb-7 text-center">
          <p
            dir="rtl"
            lang="ar"
            className={reduce ? 'font-[var(--font-arabic)] text-[22px] leading-[2.2] text-[var(--color-gold-2)]' : 'bismillah-write font-[var(--font-arabic)] text-[22px] leading-[2.2] text-[var(--color-gold-2)]'}
            style={{ textShadow: '0 0 24px rgba(200,155,60,0.35)' }}
          >
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <div className={`mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent ${reduce ? '' : 'hairline-grow'}`} />
        </div>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 46, scale: 0.94, filter: 'blur(16px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.1, delay: reduce ? 0 : 1.15, ease: EASE }}
        >
          <TiltCard>{children}</TiltCard>
        </motion.div>
      </div>
    </div>
  );
}
