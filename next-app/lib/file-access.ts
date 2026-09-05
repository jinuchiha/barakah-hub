/**
 * Authorization for privately stored files (lib/storage.ts · served by
 * /api/files/[...path]). Pure function so the rules are unit-testable
 * without a database.
 *
 * Pathname layout is the authorization boundary:
 *
 *   receipts/<memberId>/<file>   → that member, or a fund-managing role.
 *   receipts/legacy/<file>       → fund-managing roles only (rows migrated
 *                                  from the public store whose owner could
 *                                  not be determined).
 *
 * Everything else is DENIED — new private content classes must be added
 * here deliberately, never served by accident.
 */

export interface FileViewer {
  id: string;
  role: 'admin' | 'member' | 'supervisor';
}

const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/** Reject traversal and any pathname shape we never produce. */
export function isValidStoredPathname(pathname: string): boolean {
  const segments = pathname.split('/');
  if (segments.length < 2 || segments.length > 4) return false;
  return segments.every((s) => s.length > 0 && s.length <= 128 && SAFE_SEGMENT.test(s) && s !== '.' && s !== '..');
}

export function canAccessStoredFile(pathname: string, viewer: FileViewer): boolean {
  if (!isValidStoredPathname(pathname)) return false;

  const [root, owner] = pathname.split('/');
  if (root !== 'receipts') return false;

  // Receipts feed the payment-verification workflow: the submitting member
  // can re-view their own upload; admins and supervisors review all of them.
  if (viewer.role === 'admin' || viewer.role === 'supervisor') return true;
  return owner === viewer.id;
}

/**
 * A receipt reference a member may SUBMIT with a payment. Only the app's own
 * stores: the authenticated download route, or the dev-only local uploads
 * folder. An arbitrary https URL here would load in the reviewing admin's
 * browser — a tracking pixel aimed exactly at the people who approve money.
 */
export function isAllowedReceiptUrl(url: string): boolean {
  if (url.length > 500) return false;
  if (url.startsWith('/api/files/receipts/')) {
    return isValidStoredPathname(url.slice('/api/files/'.length));
  }
  return url.startsWith('/uploads/') && !url.includes('..');
}
