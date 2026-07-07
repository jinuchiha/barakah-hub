/**
 * One-shot handoff between login and the dashboard: the auth layout
 * redirects the instant isAuthenticated flips, so the welcome moment
 * must play on the FIRST dashboard mount instead of the login screen.
 */
let pendingName: string | null = null;

export function setPendingWelcome(name: string): void {
  pendingName = name;
}

export function consumePendingWelcome(): string | null {
  const n = pendingName;
  pendingName = null;
  return n;
}
