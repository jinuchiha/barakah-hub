import { put } from '@vercel/blob';

/**
 * Object storage for avatars + receipts via Vercel Blob (the app deploys on
 * Vercel, and @vercel/blob is already a dependency). Set BLOB_READ_WRITE_TOKEN
 * — Vercel injects it automatically once a Blob store is linked to the
 * project. When unset, dev falls back to public/uploads and production
 * returns a clear 501.
 */
export function isStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Upload bytes and return the public HTTPS URL. */
export async function uploadToStorage(key: string, body: Uint8Array, contentType: string): Promise<string> {
  if (!isStorageConfigured()) throw new Error('Image storage not configured');
  const blob = await put(key, Buffer.from(body), {
    access: 'public',
    contentType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });
  return blob.url;
}
