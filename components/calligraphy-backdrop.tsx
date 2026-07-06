/**
 * Ghost calligraphy layer — huge Arabic words floating far behind the
 * canvas at whisper opacity. Pure CSS drift; deterministic positions so
 * SSR and client render identically.
 */
const WORDS = [
  { text: 'بركة', top: '4%', left: '58%', size: '17rem', rotate: '-8deg', duration: '52s', delay: '0s' },
  { text: 'صدقة', top: '38%', left: '-4%', size: '13rem', rotate: '6deg', duration: '64s', delay: '-18s' },
  { text: 'رحمة', top: '62%', left: '66%', size: '11rem', rotate: '-4deg', duration: '58s', delay: '-32s' },
  { text: 'خير', top: '16%', left: '22%', size: '9rem', rotate: '10deg', duration: '70s', delay: '-9s' },
  { text: 'إحسان', top: '78%', left: '28%', size: '12rem', rotate: '-6deg', duration: '61s', delay: '-45s' },
] as const;

export function CalligraphyBackdrop() {
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {WORDS.map((w) => (
        <span
          key={w.text}
          className="calligraphy-word font-[var(--font-arabic)]"
          style={{
            top: w.top,
            left: w.left,
            fontSize: w.size,
            rotate: w.rotate,
            animationDuration: w.duration,
            animationDelay: w.delay,
          }}
        >
          {w.text}
        </span>
      ))}
    </div>
  );
}
