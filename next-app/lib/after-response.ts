import { after } from 'next/server';

/**
 * Run work after the response is sent, without losing it to the freeze.
 *
 * The codebase used `void somePromise()` in ~20 places to keep email,
 * WhatsApp and push delivery off the request's critical path. That is the
 * right instinct and the wrong mechanism on a serverless platform: once the
 * response is returned, Vercel may suspend the instance immediately, and
 * anything still sitting on the event loop simply never runs. Delivery
 * became a coin flip that lands "works" in dev (warm instance, drained
 * loop) and "silently dropped" on the cold-start path a low-traffic family
 * app actually lives on.
 *
 * `after()` is Next's supported way to say "keep the invocation alive for
 * this" — the platform waits for the callback before reclaiming the
 * instance.
 *
 * Failures are caught and logged here rather than at each call site, so a
 * dropped notification always leaves a trace instead of an unhandled
 * rejection. `label` is what you will grep for at 3 a.m.
 */
export function runAfterResponse(label: string, work: () => Promise<unknown>): void {
  const guarded = async () => {
    try {
      await work();
    } catch (err) {
      console.error(`[after:${label}] ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  try {
    after(guarded);
  } catch {
    // `after()` requires a request scope. Unit tests and one-off scripts
    // import these modules outside one — fall back to detached execution so
    // importing an action never throws.
    void guarded();
  }
}
