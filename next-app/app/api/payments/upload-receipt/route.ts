import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { meApprovedOrThrow } from '@/lib/auth-server';
import { isStorageConfigured, uploadPrivate } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Upload a payment receipt screenshot.
 *
 * Receipts are bank-transfer screenshots — PRIVATE. The blob is stored with
 * access:'private' under receipts/<memberId>/, and the returned URL is the
 * app's own authenticated download route, never the blob store. Local dev
 * (no blob token) falls back to public/uploads, which never leaves the
 * developer's machine.
 *
 * The mobile client treats a failed upload as non-fatal and still submits
 * the payment, so a 501 here never blocks a donation.
 */
export async function POST(req: Request) {
  try {
    const me = await meApprovedOrThrow();

    const formData = await req.formData();
    const file = formData.get('receipt');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 415 });
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const { randomUUID } = await import('crypto');
    const filename = `receipt_${randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (isStorageConfigured()) {
      // Owner id in the path IS the authorization record — the download
      // route grants the member access to their own receipts by prefix.
      const pathname = await uploadPrivate(`receipts/${me.id}/${filename}`, bytes, file.type);
      return NextResponse.json({ url: `/api/files/${pathname}` });
    }

    if (process.env.NODE_ENV !== 'production') {
      const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'receipts');
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(UPLOAD_DIR, filename), bytes);
      return NextResponse.json({ url: `/uploads/receipts/${filename}` });
    }

    return NextResponse.json(
      { error: 'Receipt storage not configured (set BLOB_READ_WRITE_TOKEN).' },
      { status: 501 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    const status = msg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
