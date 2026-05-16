/**
 * Barakah Hub Postgres schema (Drizzle ORM)
 *
 * Design notes:
 *  - `members` is the domain user record (charity-specific fields).
 *  - `users`/`sessions`/`accounts`/`verifications` are Better-Auth's
 *    authentication tables. `members.auth_id` → `users.id`.
 *  - `payments` carries the verification flag — only verified rows count toward fund total.
 *  - `audit_log` is append-only (DB triggers in migration 0002 enforce this).
 *  - Soft-delete via `deceased` flag on members.
 */
import { pgTable, pgEnum, uuid, text, integer, timestamp, boolean, jsonb, index, primaryKey, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ─── BETTER-AUTH TABLES ─── */
// Schema follows Better-Auth's Drizzle adapter expectations.
// Migrations live in supabase/migrations/0004_better_auth_tables.sql.

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'), // bcrypt hash for email/password provider
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(), // typically the email
  value: text('value').notNull(),           // the verification token
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ─── ENUMS ─── */
// `supervisor` is a trusted fund collector — they can record + verify
// payments (the money operations) but cannot do member CRUD, force
// case decisions, issue loans, or change config. Use canManageFunds()
// in app/lib/auth-server.ts to guard money endpoints.
export const roleEnum = pgEnum('role', ['admin', 'member', 'supervisor']);
export const statusEnum = pgEnum('member_status', ['pending', 'approved', 'rejected']);
export const poolEnum = pgEnum('fund_pool', ['sadaqah', 'zakat', 'qarz']);
export const caseStatusEnum = pgEnum('case_status', ['voting', 'approved', 'rejected', 'disbursed']);
export const caseTypeEnum = pgEnum('case_type', ['gift', 'qarz']);

/* ─── MEMBERS ─── */
export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  authId: text('auth_id').unique().references(() => users.id, { onDelete: 'set null' }),
  // ↑ Better-Auth user.id (text/nanoid). Null for record-only members
  //   that haven't claimed their account yet.
  username: text('username').notNull().unique(),
  nameUr: text('name_ur').notNull(),
  nameEn: text('name_en').notNull(),
  fatherName: text('father_name').notNull(),
  clan: text('clan'),
  relation: text('relation'),
  parentId: uuid('parent_id').references((): any => members.id, { onDelete: 'set null' }),
  // Optional husband/wife pairing. Kept in sync bidirectionally by the
  // admin edit action — see updateMember in app/actions.ts. Used by the
  // family tree to render couples side-by-side and to walk lineage from
  // both partners' fathers.
  spouseId: uuid('spouse_id').references((): any => members.id, { onDelete: 'set null' }),
  role: roleEnum('role').notNull().default('member'),
  status: statusEnum('status').notNull().default('pending'),
  phone: text('phone'),
  city: text('city'),
  province: text('province'),
  monthlyPledge: integer('monthly_pledge').notNull().default(1000),
  color: text('color').notNull().default('#2d3f6e'),
  photoUrl: text('photo_url'),
  deceased: boolean('deceased').notNull().default(false),
  needsSetup: boolean('needs_setup').notNull().default(true),
  joinedAt: date('joined_at').notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  parentIdx: index('members_parent_idx').on(t.parentId),
  fatherIdx: index('members_father_idx').on(t.fatherName),
  cityIdx: index('members_city_idx').on(t.city),
  provinceIdx: index('members_province_idx').on(t.province),
  authIdx: index('members_auth_idx').on(t.authId),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  parent: one(members, { fields: [members.parentId], references: [members.id], relationName: 'parent' }),
  children: many(members, { relationName: 'parent' }),
  payments: many(payments),
  cases: many(cases),
  loans: many(loans),
}));

/* ─── PAYMENTS ─── */
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  pool: poolEnum('pool').notNull().default('sadaqah'),
  monthLabel: text('month_label').notNull(), // e.g. 'May 2026' (display)
  monthStart: date('month_start').notNull(),  // first-of-month — sortable
  paidOn: date('paid_on').notNull().defaultNow(),
  note: text('note'),
  receiptUrl: text('receipt_url'),
  pendingVerify: boolean('pending_verify').notNull().default(false),
  // Two-step approval — supervisor approves first (intermediate),
  // admin verifies last (final). Supervisor approval is OPTIONAL —
  // admin can always verify directly. See app/actions.ts.
  supervisorApprovedAt: timestamp('supervisor_approved_at', { withTimezone: true }),
  supervisorApprovedById: uuid('supervisor_approved_by_id').references(() => members.id, { onDelete: 'set null' }),
  verifiedById: uuid('verified_by_id').references(() => members.id),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  memberIdx: index('payments_member_idx').on(t.memberId),
  monthIdx: index('payments_month_idx').on(t.monthLabel),
  monthStartIdx: index('payments_month_start_idx').on(t.monthStart),
  pendingIdx: index('payments_pending_idx').on(t.pendingVerify),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  member: one(members, { fields: [payments.memberId], references: [members.id] }),
  verifier: one(members, { fields: [payments.verifiedById], references: [members.id], relationName: 'verifier' }),
}));

/* ─── EMERGENCY CASES (votes) ─── */
export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicantId: uuid('applicant_id').notNull().references(() => members.id),
  caseType: caseTypeEnum('case_type').notNull(),
  pool: poolEnum('pool').notNull(),
  category: text('category').notNull(),
  beneficiaryName: text('beneficiary_name').notNull(),
  relation: text('relation'),
  city: text('city'),
  amount: integer('amount').notNull(),
  reasonUr: text('reason_ur').notNull(),
  reasonEn: text('reason_en').notNull(),
  emergency: boolean('emergency').notNull().default(false),
  doc: text('doc'),
  returnDate: date('return_date'),
  status: caseStatusEnum('status').notNull().default('voting'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (t) => ({
  applicantIdx: index('cases_applicant_idx').on(t.applicantId),
}));

export const votes = pgTable('votes', {
  caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').notNull().references(() => members.id),
  vote: boolean('vote').notNull(), // true = yes, false = no
  votedAt: timestamp('voted_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.caseId, t.memberId] }),
}));

/* ─── LOANS (Qarz-e-Hasana) ─── */
export const loans = pgTable('loans', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  amount: integer('amount').notNull(),
  paid: integer('paid').notNull().default(0),
  purpose: text('purpose').notNull(),
  pool: poolEnum('pool').notNull().default('qarz'),
  city: text('city'),
  issuedOn: date('issued_on').notNull().defaultNow(),
  expectedReturn: date('expected_return'),
  active: boolean('active').notNull().default(true),
  caseId: uuid('case_id').references(() => cases.id),
});

export const repayments = pgTable('repayments', {
  id: uuid('id').primaryKey().defaultRandom(),
  loanId: uuid('loan_id').notNull().references(() => loans.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  paidOn: date('paid_on').notNull().defaultNow(),
  note: text('note'),
});

/* ─── NOTIFICATIONS / MESSAGES ─── */
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientId: uuid('recipient_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  titleUr: text('title_ur'),
  titleEn: text('title_en'),
  ur: text('ur').notNull(),
  en: text('en').notNull(),
  type: text('type').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  recipientIdx: index('notifications_recipient_idx').on(t.recipientId),
  unreadIdx: index('notifications_unread_idx').on(t.recipientId, t.read),
}));

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  fromId: uuid('from_id').notNull().references(() => members.id),
  toId: uuid('to_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  read: boolean('read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  toIdx: index('messages_to_idx').on(t.toId),
}));

/* ─── MEMBER INVITES ─── */
// Admin generates an invite token (with optional max-uses). The /join/<token>
// page prefills the register form; on signup, onboardSelf consumes the token
// and links the new member to the inviter.
export const memberInvites = pgTable('member_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  createdById: uuid('created_by_id').notNull().references(() => members.id),
  label: text('label'),
  maxUses: integer('max_uses').notNull().default(1),
  usedCount: integer('used_count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revoked: boolean('revoked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tokenIdx: index('member_invites_token_idx').on(t.token),
}));

/* ─── PUSH TOKENS (mobile APK) ─── */
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  platform: text('platform').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  memberIdx: index('push_tokens_member_idx').on(t.memberId),
}));

/* ─── AUDIT LOG (append-only) ─── */
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => members.id),
  targetId: uuid('target_id').references(() => members.id),
  action: text('action').notNull(),
  detail: text('detail'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  actorIdx: index('audit_actor_idx').on(t.actorId),
  actionIdx: index('audit_action_idx').on(t.action),
  createdIdx: index('audit_created_idx').on(t.createdAt),
}));

/* ─── CONFIG (singleton row) ─── */
export const config = pgTable('config', {
  id: integer('id').primaryKey().default(1),
  voteThresholdPct: integer('vote_threshold_pct').notNull().default(50),
  defaultMonthlyPledge: integer('default_monthly_pledge').notNull().default(1000),
  goalAmount: integer('goal_amount').notNull().default(0),
  goalLabelUr: text('goal_label_ur'),
  goalLabelEn: text('goal_label_en'),
  goalDeadline: date('goal_deadline'),
  themePalette: text('theme_palette').notNull().default('gold'),
  orgNameUr: text('org_name_ur').notNull().default('بَرَكَة ہب'),
  orgNameEn: text('org_name_en').notNull().default('Barakah Hub'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/* ─── TYPES ─── */
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
export type Config = typeof config.$inferSelect;
