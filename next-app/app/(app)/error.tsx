'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
        <div className="mb-3 text-3xl">⚠️</div>
        <h2 className="mb-2 font-[var(--font-display)] text-sm font-bold uppercase tracking-[2px] text-red-400">Something went wrong</h2>
        <p className="mb-4 text-sm text-[var(--txt-3)]">{error.message || 'An unexpected error occurred.'}</p>
        <button
          onClick={reset}
          className="rounded-full border border-[var(--border)] px-6 py-2 text-sm text-[var(--color-gold-4)] transition-colors hover:bg-[rgba(214,210,199,0.08)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
