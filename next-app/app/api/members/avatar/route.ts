import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { meApprovedOrThrow } from '@/lib/auth-server';
import { db } from '@/lib/db';
import { members, auditLog } from '@/lib/db/schema';
import { isStorageConfigured, uploadPublic, deleteStored } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars');
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(req: Request) {
  try {
    const me = await meApprovedOrThrow();

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
    // No member id or timestamp in the name — uploadPublic adds a random
    // suffix, so the URL is an unguessable capability, not an enumerable key.
    const filename = `avatar.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    let url: string;
    if (isStorageConfigured()) {
      url = await uploadPublic(`avatars/${filename}`, bytes, file.type);
      // Replacing an avatar must kill the old public URL, or every replaced
      // photo stays fetchable forever. Best-effort: a failed delete must not
      // fail the upload.
      if (me.photoUrl?.includes('.blob.vercel-storage.com')) {
        await deleteStored(me.photoUrl).catch(() => {});
      }
    } else if (process.env.NODE_ENV !== 'production') {
      const localFilename = `${me.id}_${Date.now()}.${ext}`;
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(UPLOAD_DIR, localFilename), bytes);
      url = `/uploads/avatars/${localFilename}`;
    } else {
      console.error('[avatar] BLOB_READ_WRITE_TOKEN not configured · avatar uploads unavailable in production');
      return NextResponse.json(
        { error: 'Image storage not configured. Contact the administrator.' },
        { status: 503 },
      );
    }

    await db
      .update(members)
      .set({ photoUrl: url, updatedAt: new Date() })
      .where(eq(members.id, me.id));

    await db.insert(auditLog).values({ actorId: me.id, action: 'avatar-updated', detail: url });

    return NextResponse.json({ url });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Upload failed';
    const status = msg === 'Not authenticated' ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
