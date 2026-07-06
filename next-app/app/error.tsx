'use client';

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--color-ink)] px-6 text-center">
      <p className="font-[var(--font-arabic)] text-2xl leading-loose text-[var(--color-gold-2)]" dir="rtl" lang="ur">
        کچھ غلط ہو گیا
      </p>
      <h1 className="mt-3 font-[var(--font-display)] text-4xl text-[var(--color-cream)]">Something went wrong</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--txt-3)]">
        An unexpected error occurred. Your data is safe — try again, and if it
        keeps happening let the admin know.
      </p>
      <button
        onClick={reset}
        className="mt-8 rounded-full bg-[var(--color-gold)] px-6 py-2.5 text-sm font-semibold text-[#141005] transition-colors hover:bg-[var(--color-gold-2)]"
      >
        Try again
      </button>
    </div>
  );
}
