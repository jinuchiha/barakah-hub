import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { meOrThrow } from '@/lib/auth-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Upload a payment receipt screenshot.
 *
 * Strategy:
 *  - On Vercel (read-only FS): use Vercel Blob if BLOB_READ_WRITE_TOKEN
 *    is set, otherwise return 501 with a clear hint. The mobile client
 *    treats failed uploads as non-fatal and still submits the payment.
 *  - Locally (dev): write to public/uploads/receipts.
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

    // Production (Vercel) path — use Vercel Blob if available.
    if (process.env.VERCEL) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json(
          { error: 'Receipt storage not configured (BLOB_READ_WRITE_TOKEN missing).' },
          { status: 501 },
        );
      }
      try {
        // Dynamic, untyped import — package may not be installed yet.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = await import(/* @vite-ignore */ '@vercel/blob' as string).catch(() => null);
        if (!mod?.put) {
          return NextResponse.json(
            { error: '@vercel/blob not installed. Run `pnpm add @vercel/blob`.' },
            { status: 501 },
          );
        }
        const blob = await mod.put(`receipts/${filename}`, file, {
          access: 'public',
          contentType: file.type,
        });
        return NextResponse.json({ url: blob.url });
      } catch (e) {
        const m = e instanceof Error ? e.message : 'Blob upload failed';
        return NextResponse.json({ error: m }, { status: 500 });
      }
    }

    // Local dev — write to public/uploads.
    const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'receipts');
    await mkdir(UPLOAD_DIR, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    return NextResponse.json({ url: `/uploads/receipts/${filename}` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    const status = msg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
