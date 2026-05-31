import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { meOrThrow } from '@/lib/auth-server';
import { isR2Configured, uploadToR2 } from '@/lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Upload a payment receipt screenshot.
 *  - Production: Cloudflare R2 (returns an HTTPS URL).
 *  - Local dev (no R2 env): write to public/uploads/receipts.
 * The mobile client treats a failed upload as non-fatal and still submits
 * the payment, so a 501 here never blocks a donation.
 */
export async function POST(req: Request) {
  try {
    await meOrThrow();

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
    const filename = `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    if (isR2Configured()) {
      const url = await uploadToR2(`receipts/${filename}`, bytes, file.type);
      return NextResponse.json({ url });
    }

    if (process.env.NODE_ENV !== 'production') {
      const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'receipts');
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(UPLOAD_DIR, filename), bytes);
      return NextResponse.json({ url: `/uploads/receipts/${filename}` });
    }

    return NextResponse.json(
      { error: 'Receipt storage not configured (set R2_* env vars).' },
      { status: 501 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    const status = msg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
