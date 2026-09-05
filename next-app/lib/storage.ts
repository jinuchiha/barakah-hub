import { put, get, del } from '@vercel/blob';

/**
 * Object storage via Vercel Blob.
 *
 * Two access tiers, chosen per content type:
 *
 *  · PRIVATE — payment receipts. These are screenshots of bank transfers:
 *    account numbers, balances, full names. They are uploaded with
 *    access: 'private' (the blob URL itself returns 403 without the store
 *    token) and served exclusively through /api/files/[...path], which
 *    authenticates the session and authorizes per-file (owner / admin /
 *    supervisor — see lib/file-access.ts).
 *
 *  · PUBLIC — avatars. Rendered app-wide through next/image, whose
 *    optimizer fetches without credentials, so they stay public — but with
 *    addRandomSuffix so the URL is an unguessable capability, never the
 *    old predictable `{memberId}_{timestamp}` shape.
 *
 * Set BLOB_READ_WRITE_TOKEN — Vercel injects it once a Blob store is linked.
 * When unset, dev falls back to public/uploads and production returns a
 * clear 501/503 in the upload routes.
 */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const token = () => process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Upload a PRIVATE file. Returns the blob PATHNAME (not a URL) — the only
 * way to read it back is through the authenticated download route.
 */
export async function uploadPrivate(key: string, body: Uint8Array, contentType: string): Promise<string> {
  if (!isStorageConfigured()) throw new Error('Image storage not configured');
  const blob = await put(key, Buffer.from(body), {
    access: 'private',
    contentType,
    token: token(),
    // Random suffix: even if the pathname leaks, it names one file — no
    // sibling can be derived from it.
    addRandomSuffix: true,
  });
  return blob.pathname;
}

/** Upload a PUBLIC file (avatars). Returns the unguessable public URL. */
export async function uploadPublic(key: string, body: Uint8Array, contentType: string): Promise<string> {
  if (!isStorageConfigured()) throw new Error('Image storage not configured');
  const blob = await put(key, Buffer.from(body), {
    access: 'public',
    contentType,
    token: token(),
    addRandomSuffix: true,
  });
  return blob.url;
}

export interface PrivateBlobStream {
  stream: ReadableStream;
  contentType: string;
  size: number | null;
}

/** Read a PRIVATE blob back as a stream. Null when it does not exist. */
export async function readPrivate(pathname: string): Promise<PrivateBlobStream | null> {
  if (!isStorageConfigured()) return null;
  const result = await get(pathname, { access: 'private', token: token() });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const size = Number(result.headers.get('content-length'));
  return {
    stream: result.stream,
    contentType: result.headers.get('content-type') ?? 'application/octet-stream',
    size: Number.isFinite(size) && size > 0 ? size : null,
  };
}

/**
 * Delete a stored blob by URL or pathname. Used when an avatar is replaced —
 * otherwise every replacement leaks the previous image forever on a live URL.
 * Swallows nothing: callers decide whether deletion failure matters.
 */
export async function deleteStored(urlOrPathname: string): Promise<void> {
  if (!isStorageConfigured()) return;
  await del(urlOrPathname, { token: token() });
}
