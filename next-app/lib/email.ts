/**
 * Branded transactional email helpers.
 *
 * Every function gracefully no-ops when RESEND_API_KEY is unset · that
 * keeps local dev / CI green without leaking secrets, and lets us turn
 * email on/off via env without code changes.
 *
 * All callers should use the `void fireAndForget()` pattern so a failed
 * send never blocks the parent action (signup, approval, etc.). We log
 * but don't throw. The Resend SDK is dynamically imported on first send
 * so unit tests that import this module don't pay its module-load cost.
 */

const FROM = process.env.RESEND_FROM ?? 'Barakah Hub <onboarding@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://barakah-hub.vercel.app';

/* ─── Shared shell · wraps body in branded HTML chrome ─── */
function shell(title: string, body: string, ctaLabel?: string, ctaHref?: string): string {
  const cta = ctaLabel && ctaHref
    ? `<tr><td align="center" style="padding:24px 0 8px;">
        <a href="${ctaHref}" style="background:#10b981;color:#0a0e1a;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:bold;font-family:Inter,system-ui,sans-serif;display:inline-block;">${ctaLabel}</a>
      </td></tr>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Inter',system-ui,-apple-system,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0e1a;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#0f172a;border:1px solid #1e293b;border-radius:16px;overflow:hidden;">
        <tr><td align="center" style="padding:32px 24px 16px;background:radial-gradient(circle at 60% 40%, #1e293b 0%, #0f172a 70%);border-bottom:1px solid #1e293b;">
          <div style="display:inline-block;width:48px;height:48px;background:linear-gradient(135deg,#34d399,#10b981);border-radius:50%;line-height:48px;font-size:24px;">🌙</div>
          <h1 style="margin:12px 0 4px;font-size:18px;font-weight:600;color:#f8fafc;letter-spacing:0.5px;">Barakah Hub</h1>
          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:2px;">Islamic Family Fund</p>
        </td></tr>
        <tr><td style="padding:28px 24px 12px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#f8fafc;">${title}</h2>
          <div style="font-size:14px;line-height:1.6;color:#cbd5e1;">${body}</div>
        </td></tr>
        ${cta}
        <tr><td style="padding:24px 24px 32px;border-top:1px solid #1e293b;font-size:11px;color:#64748b;text-align:center;">
          <p style="margin:0 0 4px;">Barakah Hub · Family Fund Management</p>
          <p style="margin:0;"><a href="${APP_URL}" style="color:#10b981;text-decoration:none;">${APP_URL.replace('https://', '')}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function send(to: string, subject: string, html: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] Skipped "${subject}" → ${to} (RESEND_API_KEY not set)`);
    return;
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(key);
    await resend.emails.send({ from: FROM, to, subject, html, text });
  } catch (err) {
    console.warn(`[email] Failed "${subject}" → ${to}:`, err instanceof Error ? err.message : err);
  }
}

/**
 * Send an email and THROW when it does not go out.
 *
 * `send()` above swallows every failure and additionally discards Resend's
 * `{ error }` response, so even a configured provider could reject a message
 * and the caller would never learn. That is tolerable for the legacy
 * fire-and-forget call sites, which had nothing to do with the information
 * anyway.
 *
 * The outbox worker needs the opposite: a failure has to propagate so the
 * message can be retried with backoff, or land in `dead` where someone can
 * see it. Hence a separate function rather than changing `send` under ten
 * existing callers.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not configured');

  const { Resend } = await import('resend');
  const resend = new Resend(key);
  const result = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: shell(subject, `<p style="margin:0;white-space:pre-line;">${escapeHtml(text)}</p>`),
    text,
  });

  // The SDK reports API-level rejections in the response rather than by
  // throwing. Ignoring it is how a "sent" email never arrives.
  if (result.error) {
    throw new Error(`Resend rejected: ${result.error.message ?? String(result.error)}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── 1. Welcome ─── */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const body = `
    <p>السلام علیکم <strong style="color:#f8fafc;">${escape(name)}</strong>،</p>
    <p>Welcome to Barakah Hub · your family's shared fund for Sadaqah, Zakat, and Qarz-e-Hasana.</p>
    <p>Your registration is now awaiting admin approval. You'll receive another email once approved (usually within a day).</p>
    <p style="margin-top:20px;color:#94a3b8;font-size:13px;">جزاک اللہ خیرا for joining.</p>
  `;
  const text = `Welcome to Barakah Hub, ${name}.\n\nYour registration is awaiting admin approval. You'll be notified once approved.\n\n${APP_URL}`;
  await send(to, '🌙 Welcome to Barakah Hub', shell('Welcome to Barakah Hub', body, 'Open the app', APP_URL), text);
}

/* ─── 2. Approval ─── */
export async function sendApprovalEmail(to: string, name: string): Promise<void> {
  const body = `
    <p>السلام علیکم <strong style="color:#f8fafc;">${escape(name)}</strong>،</p>
    <p>Mubarak ho · your Barakah Hub account is <strong style="color:#10b981;">approved</strong>! You can now submit donations, vote on emergency cases, and view the family fund.</p>
    <p>Sign in any time and open the dashboard to see what's been happening.</p>
  `;
  const text = `Your Barakah Hub account is approved. Sign in at ${APP_URL}/login`;
  await send(to, '✅ Your Barakah Hub account is approved', shell('Account Approved', body, 'Open dashboard', `${APP_URL}/dashboard`), text);
}

/* ─── 3. Payment receipt — a digital slip: scannable QR (verification
 * page), a randomly chosen sourced dua, and Islamic ornament framing.
 * QR is served from our own domain because mail clients block data: URIs. */
export interface ReceiptInput { name: string; amount: number; pool: string; monthLabel: string; paymentId: string; verifiedAt: Date }
export async function sendPaymentReceiptEmail(to: string, r: ReceiptInput): Promise<void> {
  const { randomDua, DUA_KIND_LABEL } = await import('./duas');
  const dua = randomDua();
  const formatted = r.amount.toLocaleString('en-PK');
  const poolLabel = r.pool === 'sadaqah' ? 'Sadaqah / صدقہ' : r.pool === 'zakat' ? 'Zakat / زکوٰۃ' : 'Qarz pool';
  const receiptNo = r.paymentId.slice(0, 8).toUpperCase();
  const qrUrl = `${APP_URL}/api/receipt-qr/${r.paymentId}`;
  const verifyUrl = `${APP_URL}/verify-receipt/${r.paymentId}`;
  const body = `
    <p>السلام علیکم <strong style="color:#f8fafc;">${escape(r.name)}</strong>،</p>
    <p>Your contribution has been <strong style="color:#10b981;">verified</strong>. Jazak Allahu Khairan.</p>

    <!-- ── The slip ── -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #8a6d2f;border-radius:14px;overflow:hidden;background:linear-gradient(160deg,#141b2c 0%,#0f1626 55%,#1a1408 100%);">
      <tr><td align="center" style="padding:16px 18px 10px;border-bottom:1px solid rgba(200,155,60,0.35);background:linear-gradient(90deg,rgba(200,155,60,0.14),rgba(200,155,60,0.03),rgba(200,155,60,0.14));">
        <div style="font-size:20px;color:#d9b04c;line-height:1;">﷽</div>
        <div style="margin-top:6px;font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#a08748;">Barakah Hub · Official Receipt</div>
      </td></tr>
      <tr><td style="padding:18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="top">
              <div style="font-size:11px;color:#94a3b8;">Receipt <span style="font-family:'Courier New',monospace;color:#d9b04c;">#${receiptNo}</span></div>
              <div style="margin-top:10px;font-size:30px;font-weight:bold;color:#e8c563;">Rs ${formatted}</div>
              <div style="margin-top:10px;font-size:13px;color:#cbd5e1;line-height:1.8;">
                <strong style="color:#f8fafc;">Pool:</strong> ${poolLabel}<br>
                <strong style="color:#f8fafc;">For month:</strong> ${escape(r.monthLabel)}<br>
                <strong style="color:#f8fafc;">Verified on:</strong> ${r.verifiedAt.toLocaleDateString('en-GB')}
              </div>
            </td>
            <td valign="top" align="right" width="120">
              <a href="${verifyUrl}" style="text-decoration:none;">
                <img src="${qrUrl}" width="108" height="108" alt="Scan to verify receipt" style="border-radius:10px;border:3px solid #d9b04c;display:block;background:#f8f5ec;">
              </a>
              <div style="margin-top:6px;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#a08748;text-align:center;">Scan to verify</div>
            </td>
          </tr>
        </table>
      </td></tr>
      <!-- ── Dua band ── -->
      <tr><td align="center" style="padding:16px 22px 18px;border-top:1px dashed rgba(200,155,60,0.4);background:linear-gradient(180deg,rgba(200,155,60,0.08),rgba(200,155,60,0.02));">
        <div style="font-size:13px;color:#d9b04c;letter-spacing:6px;">۞ ۞ ۞</div>
        <div dir="rtl" style="margin-top:10px;font-size:17px;line-height:2;color:#e8c563;font-family:'Amiri','Times New Roman',serif;">${escape(dua.arabic)}</div>
        <div style="margin-top:6px;font-size:12px;font-style:italic;color:#cbd5e1;">${escape(dua.english)}</div>
        <div style="margin-top:6px;font-size:10px;letter-spacing:1.5px;color:#a08748;">${escape(DUA_KIND_LABEL[dua.type].en)} · ${escape(dua.source)}</div>
      </td></tr>
    </table>

    <p style="font-size:12px;color:#64748b;">This receipt is tamper-evident and recorded in the audit log · scan the QR (or tap it) any time to verify authenticity.</p>
  `;
  const text = `BARAKAH HUB · OFFICIAL RECEIPT\nReceipt #${receiptNo}\n\nAmount: Rs ${formatted}\nPool: ${poolLabel}\nFor: ${r.monthLabel}\nVerified: ${r.verifiedAt.toLocaleDateString('en-GB')}\n\nVerify: ${verifyUrl}\n\n"${dua.english}" — ${DUA_KIND_LABEL[dua.type].en} · ${dua.source}\n\nJazak Allahu Khairan.`;
  await send(to, `🧾 Receipt #${receiptNo}: Rs ${formatted} ${r.pool}`, shell('Payment Verified', body, 'View history', `${APP_URL}/myaccount`), text);
}

/* ─── 3b. Payment review request (to supervisors/admins) ─── */
export interface ReviewInput {
  memberName: string;
  amount: number;
  pool: string;
  monthLabel: string;
  note?: string | null;
  receiptUrl?: string | null;
  /** enables per-recipient one-tap approve links */
  paymentId?: string;
  /** set per recipient by emailFundApprovers */
  approveUrl?: string;
}
export async function sendPaymentReviewEmail(to: string, r: ReviewInput): Promise<void> {
  const formatted = r.amount.toLocaleString('en-PK');
  const poolLabel = r.pool === 'sadaqah' ? 'Sadaqah / صدقہ' : r.pool === 'zakat' ? 'Zakat / زکوٰۃ' : 'Qarz pool';
  const body = `
    <p>السلام علیکم،</p>
    <p><strong style="color:#f8fafc;">${escape(r.memberName)}</strong> has submitted a payment that is <strong style="color:#f59e0b;">awaiting your review</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #1e293b;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:14px 18px;background:#1e293b;border-bottom:1px solid #334155;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">Payment for review</div>
      </td></tr>
      <tr><td style="padding:18px 18px 4px;font-size:13px;color:#cbd5e1;">Amount</td></tr>
      <tr><td style="padding:0 18px 14px;font-size:28px;font-weight:bold;color:#f59e0b;">Rs ${formatted}</td></tr>
      <tr><td style="padding:14px 18px;font-size:13px;color:#cbd5e1;border-top:1px solid #1e293b;">
        <strong style="color:#f8fafc;">From:</strong> ${escape(r.memberName)}<br>
        <strong style="color:#f8fafc;">Pool:</strong> ${poolLabel}<br>
        <strong style="color:#f8fafc;">For month:</strong> ${escape(r.monthLabel)}
        ${r.note ? `<br><strong style="color:#f8fafc;">Note:</strong> ${escape(r.note)}` : ''}
        ${r.receiptUrl ? `<br><strong style="color:#f8fafc;">Receipt:</strong> <a href="${r.receiptUrl}" style="color:#10b981;">view screenshot</a>` : ''}
      </td></tr>
    </table>
    ${r.approveUrl
      ? '<p style="margin:22px 0 6px;">ایک ٹیپ سے منظور کریں · opens a confirmation page, no login needed:</p>'
      : '<p>Approve or reject it from the Fund Approvals queue.</p>'}
  `;
  const cta = r.approveUrl ? '✓ Approve · منظور کریں' : 'Open approval queue';
  const ctaUrl = r.approveUrl ?? `${APP_URL}/admin/fund`;
  const text = `PAYMENT FOR REVIEW\n\nFrom: ${r.memberName}\nAmount: Rs ${formatted}\nPool: ${poolLabel}\nFor: ${r.monthLabel}${r.note ? `\nNote: ${r.note}` : ''}\n\n${r.approveUrl ? `Approve (one tap): ${r.approveUrl}\n` : ''}Review at: ${APP_URL}/admin/fund`;
  await send(to, `🧾 Review: ${r.memberName} · Rs ${formatted} ${r.pool}`, shell('Payment awaiting review', body, cta, ctaUrl), text);
}

/* ─── 3c. New member registration alert (to admins) ─── */
export async function sendNewMemberEmail(to: string, memberName: string): Promise<void> {
  const body = `
    <p>السلام علیکم،</p>
    <p><strong style="color:#f8fafc;">${escape(memberName)}</strong> has registered on Barakah Hub and is <strong style="color:#f59e0b;">waiting for your approval</strong>.</p>
    <p style="color:#94a3b8;font-size:13px;">Until approved they cannot see the fund or submit anything.</p>
  `;
  const text = `NEW MEMBER REGISTRATION

${memberName} is waiting for approval.

Approve at: ${APP_URL}/admin/members`;
  await send(to, `👤 New member: ${memberName} · approval needed`, shell('New member awaiting approval', body, 'Review · منظور کریں', `${APP_URL}/admin/members`), text);
}

/* ─── 4. Emergency case alert ─── */
export interface CaseAlertInput { name: string; beneficiary: string; category: string; amount: number; reasonEn: string; caseId: string }
export async function sendEmergencyCaseEmail(to: string, c: CaseAlertInput): Promise<void> {
  const formatted = c.amount.toLocaleString('en-PK');
  const body = `
    <p>السلام علیکم <strong style="color:#f8fafc;">${escape(c.name)}</strong>،</p>
    <p>An <strong style="color:#ef4444;">emergency case</strong> has just been opened and needs the family's vote.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-left:3px solid #ef4444;background:#1e293b;border-radius:8px;">
      <tr><td style="padding:16px 18px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#fca5a5;">${escape(c.category)}</div>
        <div style="margin-top:6px;font-size:16px;font-weight:600;color:#f8fafc;">For: ${escape(c.beneficiary)}</div>
        <div style="margin-top:8px;font-size:13px;color:#cbd5e1;">${escape(c.reasonEn)}</div>
        <div style="margin-top:12px;font-size:20px;font-weight:bold;color:#f59e0b;">Rs ${formatted} requested</div>
      </td></tr>
    </table>
    <p>Your vote is needed. Open the case below to vote Yes / No.</p>
  `;
  const text = `EMERGENCY CASE\n\nFor: ${c.beneficiary} (${c.category})\nAmount: Rs ${formatted}\nReason: ${c.reasonEn}\n\nVote at: ${APP_URL}/cases`;
  await send(to, `🚨 Emergency case: ${c.beneficiary} · Rs ${formatted}`, shell('Emergency case opened', body, 'Cast your vote', `${APP_URL}/cases`), text);
}

/* ─── 5. Monthly statement ─── */
export interface MonthlySummary {
  name: string;
  monthLabel: string;
  myTotal: number;          // sum of viewer's own verified payments this month
  fundTotal: number;        // total fund verified-balance
  cases: number;            // open cases count
  loansOwed: number;        // viewer's own loans outstanding
}
export async function sendMonthlyStatementEmail(to: string, s: MonthlySummary): Promise<void> {
  const fmt = (n: number) => n.toLocaleString('en-PK');
  const body = `
    <p>السلام علیکم <strong style="color:#f8fafc;">${escape(s.name)}</strong>،</p>
    <p>Here's your Barakah Hub summary for <strong style="color:#10b981;">${escape(s.monthLabel)}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td width="50%" style="padding:14px;background:#1e293b;border:1px solid #334155;border-radius:10px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">Your contribution</div>
          <div style="margin-top:6px;font-size:22px;font-weight:bold;color:#10b981;">Rs ${fmt(s.myTotal)}</div>
        </td>
        <td width="12"></td>
        <td width="50%" style="padding:14px;background:#1e293b;border:1px solid #334155;border-radius:10px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">Total fund</div>
          <div style="margin-top:6px;font-size:22px;font-weight:bold;color:#f59e0b;">Rs ${fmt(s.fundTotal)}</div>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" style="padding:12px;font-size:12px;color:#cbd5e1;">
          <strong style="color:#f8fafc;">${s.cases}</strong> open emergency case${s.cases === 1 ? '' : 's'}
        </td>
        <td width="50%" style="padding:12px;font-size:12px;color:#cbd5e1;">
          ${s.loansOwed > 0 ? `<strong style="color:#fca5a5;">Rs ${fmt(s.loansOwed)}</strong> qarz outstanding` : '<span style="color:#94a3b8;">No outstanding loans</span>'}
        </td>
      </tr>
    </table>
  `;
  const text = `Barakah Hub · ${s.monthLabel}\n\nYour contribution: Rs ${fmt(s.myTotal)}\nTotal fund: Rs ${fmt(s.fundTotal)}\nOpen cases: ${s.cases}\nQarz outstanding: Rs ${fmt(s.loansOwed)}\n\n${APP_URL}/dashboard`;
  await send(to, `📊 Barakah Hub: ${s.monthLabel} summary`, shell(`${s.monthLabel} Summary`, body, 'Open dashboard', `${APP_URL}/dashboard`), text);
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

/* ─── 6. Weekly backup summary ─── */
interface BackupSummary {
  date: string;
  members: { total: number; approved: number };
  payments: { total: number; verified: number; pending: number };
  loans: { total: number; active: number };
  cases: { total: number; approved: number };
  auditEntries: number;
  /** Gross verified inflow — what the family has contributed in total. */
  fundTotal: number;
  /** The real position from the ledger: inflow minus outflow, per pool.
   *  A different question from fundTotal, and the one that gates a decision. */
  ledger?: {
    available: Record<string, number>;
    inflow: Record<string, number>;
    outflow: Record<string, number>;
    totalAvailable: number;
  };
  /** Notification delivery. `dead > 0` means something needs a human. */
  notifications?: {
    pending: number; sent: number; dead: number; oldestPendingMinutes: number | null;
  };
  config: { voteThreshold: number; easyPaise: string } | null;
}

export async function sendWeeklyBackupEmail(s: BackupSummary): Promise<void> {
  // Send to RESEND_FROM address (usually the admin's configured sender)
  const to = process.env.BACKUP_EMAIL ?? process.env.RESEND_FROM?.match(/<(.+)>/)?.[1] ?? '';
  if (!to) return;

  const fmtPKR = (n: number) => `Rs ${n.toLocaleString('en-PK')}`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 12px;font-size:12px;color:#94a3b8;border-bottom:1px solid #1e293b;">${escape(label)}</td>` +
    `<td style="padding:8px 12px;font-size:12px;font-weight:bold;color:#f8fafc;border-bottom:1px solid #1e293b;">${escape(value)}</td></tr>`;

  const body = `
    <p style="color:#94a3b8;font-size:13px;">Weekly snapshot · <strong style="color:#f8fafc;">${escape(s.date)}</strong></p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1e293b;border-radius:10px;overflow:hidden;margin:16px 0;">
      ${row('Total Fund', fmtPKR(s.fundTotal))}
      ${row('Members', `${s.members.approved} approved / ${s.members.total} total`)}
      ${row('Payments', `${s.payments.verified} verified, ${s.payments.pending} pending`)}
      ${row('Active Loans', String(s.loans.active))}
      ${row('Cases', `${s.cases.approved} approved / ${s.cases.total} total`)}
      ${row('Audit entries', String(s.auditEntries))}
      ${s.config ? row('EasyPaisa', s.config.easyPaise) : ''}
    </table>
    <p style="font-size:11px;color:#475569;">This is an automatic weekly backup email from Barakah Hub. Point-in-time recovery is handled by Neon Postgres PITR.</p>
  `;
  const text = `Barakah Hub Weekly Backup · ${s.date}\nFund: ${fmtPKR(s.fundTotal)}\nMembers: ${s.members.approved}/${s.members.total}\nPayments: ${s.payments.verified} verified, ${s.payments.pending} pending\n${APP_URL}/dashboard`;
  await send(to, `🗄 Barakah Hub Weekly Backup · ${s.date}`, shell(`Weekly Backup ${s.date}`, body), text);
}

/* ─── 7. Verification OTP ─── */
export async function sendOtpEmail(to: string, otp: string, type: string): Promise<void> {
  const heading = type === 'forget-password' ? 'Password reset code' : 'Your verification code';
  const body = `
    <p>السلام علیکم،</p>
    <p>${type === 'forget-password' ? 'Use this code to reset your Barakah Hub password.' : 'Use this code to verify your email and finish signing in to Barakah Hub.'}</p>
    <div style="margin:24px 0;text-align:center;">
      <span style="display:inline-block;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:14px 28px;font-size:30px;font-weight:bold;letter-spacing:10px;color:#f59e0b;font-family:'Courier New',monospace;">${escape(otp)}</span>
    </div>
    <p style="font-size:12px;color:#64748b;">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
  `;
  const text = `${heading}: ${otp}\n\nExpires in 10 minutes.`;
  await send(to, `${otp} · Barakah Hub ${type === 'forget-password' ? 'reset' : 'verification'} code`, shell(heading, body), text);
}
