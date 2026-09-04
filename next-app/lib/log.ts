/**
 * Structured logging with a request id.
 *
 * The audit asked seven questions of this system and only one had an answer.
 * The reason was the log format: ~40 bare `console.error('[push] ...')` calls
 * with no request id, no actor, no duration and no shape. Given a user
 * saying "my payment failed this morning", there was no way to find the
 * lines belonging to that request — Vercel's log view is a flat stream, and
 * grep needs something to grep for.
 *
 * So: one line per event, JSON, always carrying the request id. That makes
 * "show me everything for request abc123" a text search, and lets Sentry
 * events be correlated with the log lines around them.
 *
 * Not a logging library. A library would add a dependency, a transport
 * config and a bundle cost to produce the same JSON that `console.log`
 * already ships to Vercel's collector for free.
 */
import { headers } from 'next/headers';

export type Level = 'debug' | 'info' | 'warn' | 'error';

/** Header the edge middleware stamps, and the name Vercel's UI also uses. */
export const REQUEST_ID_HEADER = 'x-request-id';

export interface LogFields {
  /** What happened, in dot.case. Grep target: `event:"payment.verified"`. */
  event: string;
  /** Who caused it. A member id, never a name or an email. */
  actorId?: string;
  /** What it acted on. */
  targetId?: string;
  /** Milliseconds, for anything worth timing. */
  durationMs?: number;
  /** Extra context. Keep it small and never put PII in it. */
  [key: string]: unknown;
}

/**
 * Read the request id stamped by middleware.
 *
 * Returns 'no-request-scope' rather than throwing, so a module imported by a
 * script or a test can still log.
 */
async function currentRequestId(): Promise<string> {
  try {
    const h = await headers();
    return h.get(REQUEST_ID_HEADER) ?? 'unstamped';
  } catch {
    return 'no-request-scope';
  }
}

function emit(level: Level, fields: LogFields, requestId: string): void {
  const line = JSON.stringify({
    level,
    requestId,
    ts: new Date().toISOString(),
    ...fields,
  });
  // Vercel routes stdout/stderr to its log collector, and separating error
  // from the rest keeps the platform's own severity filter useful.
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

async function log(level: Level, fields: LogFields): Promise<void> {
  emit(level, fields, await currentRequestId());
}

export const logger = {
  debug: (f: LogFields) => log('debug', f),
  info: (f: LogFields) => log('info', f),
  warn: (f: LogFields) => log('warn', f),
  error: (f: LogFields) => log('error', f),
};

/**
 * Log a failure with its cause, without leaking internals to the caller.
 *
 * `err` is reduced to its message and name. Stack traces belong in Sentry,
 * which has the source maps to make them readable; duplicating them here
 * just makes the log expensive to read.
 */
export function logError(fields: LogFields & { err: unknown }): Promise<void> {
  const { err, ...rest } = fields;
  return logger.error({
    ...rest,
    errorName: err instanceof Error ? err.name : typeof err,
    errorMessage: err instanceof Error ? err.message : String(err),
  });
}

/**
 * Time an operation and log how long it took.
 *
 * Used on the money paths, so "is the database slow?" and "which endpoint is
 * failing?" become answerable from the logs alone. Re-throws so it is
 * transparent to control flow.
 */
export async function timed<T>(event: string, fn: () => Promise<T>, fields: Omit<LogFields, 'event'> = {}): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    await logger.info({ event, ...fields, durationMs: Date.now() - started, outcome: 'ok' });
    return result;
  } catch (err) {
    await logError({ event, ...fields, durationMs: Date.now() - started, outcome: 'error', err });
    throw err;
  }
}
