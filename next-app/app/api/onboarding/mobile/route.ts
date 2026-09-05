import { NextRequest, NextResponse } from 'next/server';
import { and, eq, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getUser } from '@/lib/auth-server';
import { db, inTransaction } from '@/lib/db';
import { members, auditLog, memberInvites } from '@/lib/db/schema';
import { notifyMembers, adminIds, alertAdminsNewMember } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Mobile-friendly onboarding.
 *
 * The mobile register screen only asks the user for `name`, `email`,
 * `password`, optional `phone` and `monthlyPledge`. The full web
 * onboarding form requires fatherName / city / province too · too
 * heavy for the mobile signup UX.
 *
 * This route accepts the minimal mobile signup payload and creates a
 * `members` row with status='pending', so the new account immediately
 * appears in /admin/members for approval. fatherName is required by
 * the schema so we default it to "—" and let the user fill it in
 * later via Edit Profile.
 *
 * Auth is required (user must already be signed in via /sign-up/email).
 * If a member row already exists for this auth_id, returns it
 * idempotently (safe to retry).
 */
const schema = z.object({
  nameEn: z.string().min(1).max(80),
  nameUr: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  monthlyPledge: z.number().int().min(0).max(1_000_000).optional(),
  city: z.string().max(60).optional(),
  province: z.string().max(40).optional(),
  fatherName: z.string().max(80).optional(),
  fatherDeceased: z.boolean().optional(),
  joinCode: z.string().max(40).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authUser = await getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Idempotent: if a member row already exists for this auth user,
    // return it instead of creating a duplicate (and 409-ing).
    const [existing] = await db
      .select()
      .from(members)
      .where(eq(members.authId, authUser.id))
      .limit(1);
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const body = await req.json();
    const data = schema.parse(body);

    // Derive username from email prefix; collisions are extremely
    // unlikely with the email→prefix mapping but disambiguate just in
    // case (admin import + mobile signup with same prefix).
    const emailPrefix = authUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    let username = emailPrefix || `user${Date.now()}`;
    for (let i = 1; i < 10; i++) {
      const [clash] = await db.select({ id: members.id }).from(members).where(eq(members.username, username)).limit(1);
      if (!clash) break;
      username = `${emailPrefix}${i + 1}`;
    }

    // Validate invite/join code (if provided)
    let validInvite: { id: string } | null = null;
    if (data.joinCode) {
      const [inv] = await db
        .select({ id: memberInvites.id, maxUses: memberInvites.maxUses, usedCount: memberInvites.usedCount, revoked: memberInvites.revoked, expiresAt: memberInvites.expiresAt })
        .from(memberInvites)
        .where(eq(memberInvites.token, data.joinCode))
        .limit(1);
      if (inv && !inv.revoked && (!inv.expiresAt || inv.expiresAt > new Date()) && inv.usedCount < inv.maxUses) {
        validInvite = { id: inv.id };
      }
    }

    // Member row, invite consumption and audit entry commit or fail as ONE
    // unit. Previously the member was created first and the invite update
    // ran unchecked afterwards — a crash in between left an admitted member
    // on an unconsumed invite, and an exhausted invite was silently ignored.
    const created = await inTransaction(async (tx) => {
      if (validInvite) {
        const consumed = await tx
          .update(memberInvites)
          .set({ usedCount: sql`${memberInvites.usedCount} + 1` })
          .where(and(eq(memberInvites.id, validInvite.id), lt(memberInvites.usedCount, memberInvites.maxUses)))
          .returning({ id: memberInvites.id });
        // Rowcount checked: a concurrent signup taking the last use makes
        // THIS one fail loudly instead of admitting past the cap.
        if (consumed.length === 0) {
          throw new Error('INVITE_EXHAUSTED');
        }
      }

      const [row] = await tx
        .insert(members)
        .values({
          authId: authUser.id,
          username,
          nameEn: data.nameEn,
          nameUr: data.nameUr || data.nameEn,
          fatherName: data.fatherName?.trim() ?? '',
          fatherDeceased: data.fatherDeceased ?? false,
          phone: data.phone,
          city: data.city,
          province: data.province,
          monthlyPledge: data.monthlyPledge ?? 1000,
          status: 'pending',
          role: 'member',
        })
        .returning();

      await tx.insert(auditLog).values({
        actorId: row.id,
        action: 'member-added',
        detail: `Mobile signup: ${data.nameEn} (${authUser.email}) · awaiting approval`,
      });
      return row;
    });


    // Tell admins a new member is waiting for approval.
    await notifyMembers(
      await adminIds(),
      {
        titleEn: 'New member to approve', titleUr: 'نیا رکن برائے منظوری',
        en: `${data.nameEn} signed up and is awaiting your approval.`,
        ur: `${data.nameUr || data.nameEn} نے سائن اپ کیا اور آپ کی منظوری کا منتظر ہے۔`,
        type: 'member-pending',
      },
      { title: '👤 New member to approve', body: data.nameEn, data: { type: 'member-pending' }, channelId: 'admin' },
    );
    void alertAdminsNewMember(data.nameEn).catch((err) => { console.error('[notify] new member alert:', err); });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bad request';
    if (msg === 'INVITE_EXHAUSTED') {
      return NextResponse.json(
        { error: 'This invite link has reached its usage limit. Ask for a new one.' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
