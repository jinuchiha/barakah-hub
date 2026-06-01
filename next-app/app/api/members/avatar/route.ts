import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { meOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members } from '@/lib/db/schema';
import { isStorageConfigured, uploadToStorage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: Request) {
  try {
    const me = await meOrThrow();

    const formData = await req.formData();
    const file = formData.get('avatar');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 2 MB)' }, { status: 413 });
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 415 });
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const filename = `${me.id}_${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    // Production: Cloudflare R2 (HTTPS URL). Local dev fallback: public/uploads.
    let url: string;
    if (isStorageConfigured()) {
      url = await uploadToStorage(`avatars/${filename}`, bytes, file.type);
    } else if (process.env.NODE_ENV !== 'production') {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(UPLOAD_DIR, filename), bytes);
      url = `/uploads/avatars/${filename}`;
    } else {
      return NextResponse.json(
        { error: 'Image storage not configured (set BLOB_READ_WRITE_TOKEN).' },
        { status: 501 },
      );
    }

    await db
      .update(members)
      .set({ photoUrl: url, updatedAt: new Date() })
      .where(eq(members.id, me.id));

    return NextResponse.json({ url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    const status = msg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
