/**
 * WhatsApp deep-link generators with auto Pakistan country-code normalization
 * + pre-formatted bilingual Urdu messages (Bismillah + greeting + closing dua).
 */
import { normalizePkPhone } from '@/lib/utils';
import { fmtRs } from '@/lib/i18n/dict';
import type { Member } from '@/lib/db/schema';

// The Basmala is Arabic (Qur'an 1:1) — written in Arabic orthography with
// diacritics, not in Urdu letterforms, even inside an Urdu message.
const BISMILLAH = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
const CLOSING = '\n\nجزاک اللہ خیر · بَرَكَة ہب · Barakah Hub';

export function waUrl(phone: string | null | undefined, message: string): string | null {
  const p = normalizePkPhone(phone);
  if (!p) return null;
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
}

export function buildPaymentReminder(member: Member, monthLabel: string): string {
  const monthly = member.monthlyPledge || 1000;
  return [
    BISMILLAH,
    '',
    `السلام علیکم ${member.nameUr || member.nameEn}`,
    '',
    `*یاد دہانی:* ${monthLabel} کی ماہانہ ادائیگی ابھی باقی ہے`,
    '',
    `ماہانہ حصہ: *${fmtRs(monthly)}*`,
    '',
    // Sourced, sahih encouragement — never an unattributed or weak narration,
    // least of all in a message that asks a member for money.
    'صدقہ مال کو کبھی کم نہیں کرتا۔ (صحیح مسلم 2588)',
    CLOSING.trim(),
  ].join('\n');
}

export function buildVoteReminder(member: Member, beneficiary: string, amount: number, categoryUr: string): string {
  return [
    BISMILLAH,
    '',
    `السلام علیکم ${member.nameUr || member.nameEn}`,
    '',
    `*${categoryUr} ووٹ کی درخواست*`,
    '',
    `درخواست کنندہ: *${beneficiary}*`,
    `رقم: *${fmtRs(amount)}*`,
    '',
    'براہ کرم ایپ میں جا کر اپنا ووٹ ضرور دیں۔',
    'آپ کا ووٹ خاندان کے لیے اہم ہے۔',
    CLOSING.trim(),
  ].join('\n');
}

export function buildApprovalNotice(member: Member, amount: number, categoryUr: string): string {
  return [
    BISMILLAH,
    '',
    `السلام علیکم ${member.nameUr || member.nameEn}`,
    '',
    '🎉 *مبارک ہو!*',
    '',
    `آپ کی ${categoryUr} درخواست منظور ہو گئی`,
    `رقم: *${fmtRs(amount)}*`,
    '',
    'اللہ آپ کی مشکل آسان فرمائے',
    CLOSING.trim(),
  ].join('\n');
}

/* ─── Automated delivery via WhatsApp Cloud API ───
 * Business-initiated messages outside a 24-hour customer window MUST use
 * an approved template — set WHATSAPP_TEMPLATE_REMINDER to its name.
 * Free-text send is kept for replies inside an open session. Both no-op
 * with a console warning when the env pair is missing, mirroring email.
 */

const WA_API = 'https://graph.facebook.com/v20.0';

function waConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Never let Meta's gateway hold a serverless invocation open. */
const WA_TIMEOUT_MS = 10_000;

/**
 * Meta error codes that mean "this message needed an approved template".
 * 131047 — re-engagement message outside the 24-hour customer service window.
 * 131026 — message undeliverable (commonly the same root cause).
 * 470    — legacy code for the same condition.
 *
 * These are the single most likely reason a receipt or approval notice never
 * arrives, and the previous code logged them identically to a network blip,
 * so nobody could tell the difference.
 */
const SESSION_WINDOW_ERRORS = new Set([131047, 131026, 470]);

export type WhatsAppFailure =
  | 'not-configured' | 'no-phone' | 'outside-session-window' | 'api-error' | 'network';

export interface WhatsAppResult {
  ok: boolean;
  reason?: WhatsAppFailure;
  detail?: string;
}

async function waPost(payload: Record<string, unknown>, kind: string): Promise<WhatsAppResult> {
  if (!waConfigured()) {
    console.warn('[whatsapp] Skipped send (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set)');
    return { ok: false, reason: 'not-configured' };
  }
  try {
    const res = await fetch(`${WA_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
      signal: AbortSignal.timeout(WA_TIMEOUT_MS),
    });

    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => '');
    let code: number | undefined;
    try { code = JSON.parse(raw)?.error?.code; } catch { /* non-JSON body */ }

    if (code !== undefined && SESSION_WINDOW_ERRORS.has(code)) {
      // Explicit, actionable, and distinguishable from every other failure.
      console.error(
        `[whatsapp] ${kind} REJECTED (code ${code}): outside the 24-hour customer-service window. ` +
        'Business-initiated messages require an approved template — configure the matching ' +
        'WHATSAPP_TEMPLATE_* env var. This message was NOT delivered.',
      );
      return { ok: false, reason: 'outside-session-window', detail: `code ${code}` };
    }

    console.error(`[whatsapp] ${kind} failed: ${res.status} ${raw.slice(0, 200)}`);
    return { ok: false, reason: 'api-error', detail: `${res.status}` };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[whatsapp] ${kind} error: ${detail}`);
    return { ok: false, reason: 'network', detail };
  }
}

/** Template send — the only kind WhatsApp allows outside a 24h session. */
export async function sendWhatsAppTemplate(
  phone: string | null | undefined,
  templateName: string,
  bodyParams: string[],
  lang = 'ur',
): Promise<boolean> {
  const to = normalizePkPhone(phone);
  if (!to) return false;
  const res = await waPost({
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
      components: [
        { type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) },
      ],
    },
  }, `template:${templateName}`);
  return res.ok;
}

/**
 * Free-text send. Delivered ONLY inside an open 24-hour session window —
 * i.e. when the member has messaged the business number recently.
 *
 * Prefer `sendWhatsAppBusinessMessage` for anything the app initiates
 * (receipts, approvals, reminders, alerts): those are outside the window by
 * definition and Meta rejects them unless they use an approved template.
 */
export async function sendWhatsAppText(phone: string | null | undefined, body: string): Promise<boolean> {
  const res = await sendWhatsAppTextResult(phone, body);
  return res.ok;
}

/** Same as sendWhatsAppText but surfaces WHY a send failed. */
export async function sendWhatsAppTextResult(
  phone: string | null | undefined,
  body: string,
): Promise<WhatsAppResult> {
  const to = normalizePkPhone(phone);
  if (!to) return { ok: false, reason: 'no-phone' };
  return waPost({ to, type: 'text', text: { body } }, 'text');
}

/**
 * Business-initiated message — the app is reaching out, not replying.
 *
 * Every notification this app sends (payment receipt, account approval,
 * emergency vote request, monthly statement, broadcast) is business-initiated
 * and therefore outside the 24-hour window for most recipients. The codebase
 * previously sent all of them as free text, so Meta rejected them, `waPost`
 * logged a warning nobody read, and the return value was discarded — the
 * primary notification channel for this audience failed invisibly.
 *
 * Behaviour:
 *   · A template name configured in `templateEnvVar` → send the template.
 *     This is the only path that reliably delivers.
 *   · No template configured → attempt free text, which succeeds only if the
 *     member happens to be inside an open session window, and logs an
 *     explicit, actionable error naming the env var to set when it is not.
 *
 * The fallback is kept deliberately: for a family where members do reply on
 * WhatsApp, free text often works, and dropping it would remove working
 * delivery. What changes is that failure is now loud and diagnosable.
 */
export async function sendWhatsAppBusinessMessage(
  phone: string | null | undefined,
  opts: {
    templateEnvVar: string;
    templateParams: string[];
    fallbackText: string;
    lang?: string;
  },
): Promise<WhatsAppResult> {
  const to = normalizePkPhone(phone);
  if (!to) return { ok: false, reason: 'no-phone' };

  const templateName = process.env[opts.templateEnvVar];
  if (templateName) {
    const ok = await sendWhatsAppTemplate(to, templateName, opts.templateParams, opts.lang ?? 'ur');
    return ok ? { ok: true } : { ok: false, reason: 'api-error' };
  }

  const res = await sendWhatsAppTextResult(to, opts.fallbackText);
  if (!res.ok && res.reason === 'outside-session-window') {
    console.error(
      `[whatsapp] Set ${opts.templateEnvVar} to an approved template name to deliver this ` +
      'message type reliably. Until then it only reaches members inside a 24h session window.',
    );
  }
  return res;
}
