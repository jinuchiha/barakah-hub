'use client';

/**
 * Root-layout error boundary. Without this file, an error thrown in the root
 * layout itself (font load, theme boot script, Toaster) falls through to
 * Next's unstyled default page. Must render its own <html>/<body> because it
 * replaces the root layout entirely.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0f1a', color: '#ece9e0', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 34 }} aria-hidden>☾</div>
          <h1 style={{ fontSize: 19, fontWeight: 600, margin: '8px 0 6px' }}>Something went wrong</h1>
          <p style={{ color: '#9aa0ab', fontSize: 14, maxWidth: '36ch', lineHeight: 1.6, margin: '0 auto 16px' }}>
            The page failed to load. Your data is safe — try again, and contact
            the admin if it keeps happening.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ cursor: 'pointer', borderRadius: 8, border: '1px solid rgba(200,155,60,0.45)', background: 'rgba(200,155,60,0.12)', color: '#e8c563', padding: '8px 18px', fontSize: 13, fontWeight: 600 }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
