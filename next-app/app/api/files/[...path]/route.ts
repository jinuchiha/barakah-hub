import { NextResponse } from 'next/server';
import { meApprovedOrThrow } from '@/lib/auth-server';
import { readPrivate } from '@/lib/storage';
import { canAccessStoredFile } from '@/lib/file-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Authenticated download endpoint for PRIVATE blobs (payment receipts).
 *
 * The blob store URL itself is never exposed: uploads return an app path
 * (`/api/files/<pathname>`) and this route is the only reader. Every request
 * re-authenticates (session cookie or mobile Bearer token) and re-authorizes
 * against the pathname (owner / admin / supervisor — lib/file-access.ts),
 * so a forwarded link is worthless outside those accounts and there is no
 * IDOR surface: guessing pathnames yields 404-shaped 403s on other people's
 * files and random suffixes make guessing infeasible anyway.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const me = await meApprovedOrThrow();
    const { path } = await params;
    const pathname = (path ?? []).join('/');

    if (!canAccessStoredFile(pathname, { id: me.id, role: me.role })) {
      // One response for "denied" and "does not exist" — no probing oracle.
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const file = await readPrivate(pathname);
    if (!file) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return new Response(file.stream, {
      headers: {
        'Content-Type': file.contentType,
        ...(file.size !== null ? { 'Content-Length': String(file.size) } : {}),
        // Private per-user content: browsers may cache locally, shared
        // caches must not.
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        // Render inline (receipt preview) but never as a document that could
        // execute — images only reach here (upload routes enforce MIME).
        'Content-Disposition': 'inline',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    const status = msg === 'Not authenticated' ? 401 : msg === 'Account not approved' ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? 'Error' : msg }, { status });
  }
}
