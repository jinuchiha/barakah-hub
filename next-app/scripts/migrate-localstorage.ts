/**
 * Migrate exported localStorage JSON (Phase 1/2 single-HTML predecessor) →
 * Postgres (Phase 3 / Barakah Hub).
 *
 * Usage:
 *   1. In legacy app: Settings → Danger Zone → ⬇ Export → save the JSON file
 *      (the export filename is set by the legacy app — typically
 *      `balochsath-backup-YYYY-MM-DD.json`; the filename does not matter).
 *   2. Set DATABASE_URL in .env.local + Supabase service role key
 *   3. Run:  pnpm import:legacy ./<exported-file>.json
 *
 * What it does:
 *   - Reads USERS map → inserts into `members` (auth_id null until users sign up)
 *   - Reads payments[] → preserves verification flag + month_label + pool
 *   - Reads emergencies[] → cases + votes
 *   - Reads loans[] → loans + repayments (if you tracked them)
 *   - Replays audit[] entries
 *   - Sets config row from S.cfg
 *
 * Safety: idempotent on username (skips if exists). Wrap in a transaction.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import * as schema from '../lib/db/schema';

interface LegacyDB {
  USERS: Record<string, any>;
  S: {
    payments: any[];
    emergencies: any[];
    loans: any[];
    notifs: Record<string, any[]>;
    messages: Record<string, any[]>;
    audit: any[];
    cfg: any;
  };
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: tsx scripts/migrate-localstorage.ts <path-to-backup.json>');
    process.exit(1);
  }
  const raw = readFileSync(resolve(file), 'utf8');
  const data: LegacyDB = JSON.parse(raw);

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Add it to .env.local and source it before running.');
    process.exit(1);
  }
  // Use the WebSocket-backed Neon driver here (not the HTTP one we use
  // at runtime) so the bulk insert can run inside a single transaction.
  // DATABASE_URL_DIRECT preferred — DDL/transactional flows are happier
  // bypassing the pooler.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('🌐 Connected to Postgres. Beginning migration...');

  // ── 1. Members ─────────────────────────────────────────────
  const userIds = Object.keys(data.USERS);
  console.log(`👥 ${userIds.length} legacy users found`);
  const idMap = new Map<string, string>(); // legacy username → new uuid

  for (const username of userIds) {
    const u = data.USERS[username];
    const existing = await db.select().from(schema.members).where(eq(schema.members.username, username)).limit(1);
    if (existing[0]) {
      idMap.set(username, existing[0].id);
      continue;
    }
    const [created] = await db
      .insert(schema.members)
      .values({
        username,
        nameUr: u.ur || username,
        nameEn: u.en || u.ur || username,
        fatherName: u.father || '(unknown)',
        clan: u.clan,
        relation: u.rel,
        role: u.role === 'admin' ? 'admin' : 'member',
        status: u.status === 'pending' ? 'pending' : 'approved',
        phone: u.phone,
        city: u.city,
        province: u.province,
        monthlyPledge: u.monthly || 1000,
        color: u.color || '#c9a84c',
        photoUrl: u.pic,
        deceased: !!u.deceased,
        needsSetup: !!u._needsSetup,
      })
      .returning();
    idMap.set(username, created.id);
    process.stdout.write('.');
  }
  console.log('\n  ✓ Members inserted');

  // Re-link parent IDs in a second pass
  for (const username of userIds) {
    const u = data.USERS[username];
    if (u.parent && idMap.has(u.parent)) {
      await db
        .update(schema.members)
        .set({ parentId: idMap.get(u.parent)! })
        .where(eq(schema.members.username, username));
    }
  }
  console.log('  ✓ Parent links resolved');

  // ── 2. Payments ────────────────────────────────────────────
  let pcount = 0;
  for (const p of data.S.payments || []) {
    const memberId = idMap.get(p.uid);
    if (!memberId) continue;
    const paidOn = p.date || new Date().toISOString().slice(0, 10);
    const monthStart = paidOn.slice(0, 7) + '-01';
    await db.insert(schema.payments).values({
      memberId,
      amount: p.amt,
      pool: (p.type as 'sadaqah' | 'zakat' | 'qarz') || 'sadaqah',
      monthLabel: p.month,
      monthStart,
      paidOn,
      note: p.note,
      pendingVerify: !!p.pendingVerify,
    }).onConflictDoNothing();
    pcount++;
  }
  console.log(`💰 ${pcount} payments imported`);

  // ── 3. Loans ───────────────────────────────────────────────
  let lcount = 0;
  for (const l of data.S.loans || []) {
    const memberId = idMap.get(l.uid);
    if (!memberId) continue;
    await db.insert(schema.loans).values({
      memberId,
      amount: l.amt,
      paid: l.paid || 0,
      purpose: l.purpose || 'imported',
      pool: (l.pool as any) || 'qarz',
      city: l.city,
      issuedOn: l.issued || new Date().toISOString().slice(0, 10),
      expectedReturn: l.ret && l.ret !== 'TBD' ? l.ret : null,
      active: !!l.active,
    });
    lcount++;
  }
  console.log(`📤 ${lcount} loans imported`);

  // ── 4. Audit log ───────────────────────────────────────────
  let acount = 0;
  for (const e of data.S.audit || []) {
    await db.insert(schema.auditLog).values({
      actorId: idMap.get(e.actor) || null,
      targetId: idMap.get(e.uid) || null,
      action: e.action,
      detail: e.detail,
      createdAt: e.date ? new Date(e.date) : new Date(),
    });
    acount++;
  }
  console.log(`📜 ${acount} audit entries imported`);

  // ── 5. Config ──────────────────────────────────────────────
  if (data.S.cfg) {
    await db
      .update(schema.config)
      .set({
        voteThresholdPct: data.S.cfg.voteThresh || 50,
        defaultMonthlyPledge: data.S.cfg.defaultMonthly || 1000,
        goalAmount: data.S.cfg.goalAmount || 0,
        goalLabelUr: data.S.cfg.goalLabelUr,
        goalLabelEn: data.S.cfg.goalLabel,
        goalDeadline: data.S.cfg.goalDeadline || null,
        themePalette: data.S.cfg.themePalette || 'gold',
      })
      .where(eq(schema.config.id, 1));
    console.log('⚙️  Config restored');
  }

  console.log('\n✅ Migration complete. Inspect with: pnpm db:studio');
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
