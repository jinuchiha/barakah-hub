'use client';
import { useEffect, useState } from 'react';

/**
 * Tap a profile photo → view it large. Renders its children as the
 * trigger; the full image opens in a dismissable overlay (click
 * anywhere or Esc). No-op trigger styling — parent controls layout.
 */
export function PhotoLightbox({ src, alt, children }: {
  src: string | null | undefined;
  alt: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!src) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="cursor-zoom-in appearance-none border-0 bg-transparent p-0"
        aria-label={`View ${alt} photo`}
      >
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[999] grid place-items-center bg-[rgba(4,7,12,0.92)] p-6 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <img
            src={src}
            alt={alt}
            className="max-h-[82vh] max-w-[92vw] rounded-2xl border border-[rgba(217,176,76,0.4)] object-contain shadow-2xl"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute right-5 top-5 grid size-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--surf-2)] text-lg text-[var(--color-cream)] hover:bg-[var(--surf-3)]"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}
