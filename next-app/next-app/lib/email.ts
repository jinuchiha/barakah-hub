/**
 * Branded transactional email helpers.
 *
 * Every function gracefully no-ops when RESEND_API_KEY is unset — that
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

/* ─── Shared shell — wraps body in branded HTML chrome ─── */
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

/* ─── 1. Welcome ─── */
export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const body = `
    <p>السلام علیکم <strong style="color:#f8fafc;">${escape(name)}</strong>،</p>
    <p>Welcome to Barakah Hub — your family's shared fund for Sadaqah, Zakat, and Qarz-e-Hasana.</p>
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
    <p>Mubarak ho — your Barakah Hub account is <strong style="color:#10b981;">approved</strong>! You can now submit donations, vote on emergency cases, and view the family fund.</p>
    <p>Sign in any time and open the dashboard to see what's been happening.</p>
  `;
  const text = `Your Barakah Hub account is approved. Sign in at ${APP_URL}/login`;
  await send(to, '✅ Your Barakah Hub account is approved', shell('Account Approved', body, 'Open dashboard', `${APP_URL}/dashboard`), text);
}

/* ─── 3. Payment receipt ─── */
export interface ReceiptInput { name: string; amount: number; pool: string; monthLabel: string; paymentId: string; verifiedAt: Date }
export async function sendPaymentReceiptEmail(to: string, r: ReceiptInput): Promise<void> {
  const formatted = r.amount.toLocaleString('en-PK');
  const poolLabel = r.pool === 'sadaqah' ? 'Sadaqah / صدقہ' : r.pool === 'zakat' ? 'Zakat / زکوٰۃ' : 'Qarz pool';
  const body = `
    <p>السلام علیکم <strong style="color:#f8fafc;">${escape(r.name)}</strong>،</p>
    <p>Your contribution has been <strong style="color:#10b981;">verified</strong>. Jazak Allahu Khairan.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #1e293b;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:14px 18px;background:#1e293b;border-bottom:1px solid #334155;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#94a3b8;">Receipt</div>
        <div style="font-size:11px;color:#64748b;font-family:'Courier New',monospace;">#${r.paymentId.slice(0, 8).toUpperCase()}</div>
      </td></tr>
      <tr><td style="padding:18px 18px 4px;font-size:13px;color:#cbd5e1;">Amount</td></tr>
      <tr><td style="padding:0 18px 14px;font-size:28px;font-weight:bold;color:#f59e0b;">Rs ${formatted}</td></tr>
      <tr><td style="padding:0 18px 14px;font-size:13px;color:#cbd5e1;border-top:1px solid #1e293b;padding-top:14px;">
        <strong style="color:#f8fafc;">Pool:</strong> ${poolLabel}<br>
        <strong style="color:#f8fafc;">For month:</strong> ${escape(r.monthLabel)}<br>
        <strong style="color:#f8fafc;">Verified on:</strong> ${r.verifiedAt.toLocaleDateString('en-GB')}
      </td></tr>
    </table>
    <p style="font-size:12px;color:#64748b;">This receipt is tamper-evident and recorded in the audit log. Keep it for your records.</p>
  `;
  const text = `Receipt #${r.paymentId.slice(0, 8).toUpperCase()}\n\nAmount: Rs ${formatted}\nPool: ${poolLabel}\nFor: ${r.monthLabel}\nVerified: ${r.verifiedAt.toLocaleDateString('en-GB')}\n\nJazak Allahu Khairan.\n\n${APP_URL}/myaccount`;
  await send(to, `🧾 Receipt: Rs ${formatted} ${r.pool}`, shell('Payment Verified', body, 'View history', `${APP_URL}/myaccount`), text);
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
  const text = `Barakah Hub — ${s.monthLabel}\n\nYour contribution: Rs ${fmt(s.myTotal)}\nTotal fund: Rs ${fmt(s.fundTotal)}\nOpen cases: ${s.cases}\nQarz outstanding: Rs ${fmt(s.loansOwed)}\n\n${APP_URL}/dashboard`;
  await send(to, `📊 Barakah Hub: ${s.monthLabel} summary`, shell(`${s.monthLabel} Summary`, body, 'Open dashboard', `${APP_URL}/dashboard`), text);
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
