'use client';

/**
 * Route-group error boundary for authenticated pages.
 *
 * No console.error here: Sentry (instrumentation-client.ts) already captures
 * the error, and echoing it to the browser console only leaks stack detail.
 * `error.message` is also not rendered — in production React redacts server
 * errors to a digest, so the paragraph would render empty while looking
 * informative in dev.
 */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
        <h2 className="mb-2 font-[var(--font-display)] text-sm font-bold uppercase tracking-[2px] text-red-400">Something went wrong</h2>
        <p className="mb-4 text-sm text-[var(--txt-3)]">
          The page failed to load. Your data is safe — try again, and message
          the admin if it keeps happening.
        </p>
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
