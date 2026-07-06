/**
 * WhatsApp deep-link generators with auto Pakistan country-code normalization
 * + pre-formatted bilingual Urdu messages (Bismillah + greeting + closing dua).
 */
import { normalizePkPhone } from '@/lib/utils';
import { fmtRs } from '@/lib/i18n/dict';
import type { Member } from '@/lib/db/schema';

const BISMILLAH = 'بسم اللہ الرحمن الرحیم';
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
    'صدقہ بلاؤں کو ٹال دیتا ہے',
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

async function waPost(payload: Record<string, unknown>): Promise<boolean> {
  if (!waConfigured()) {
    console.warn('[whatsapp] Skipped send (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set)');
    return false;
  }
  try {
    const res = await fetch(`${WA_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    });
    if (!res.ok) {
      console.warn('[whatsapp] send failed:', res.status, (await res.text()).slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[whatsapp] send error:', err instanceof Error ? err.message : err);
    return false;
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
  return waPost({
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
      components: [
        { type: 'body', parameters: bodyParams.map((text) => ({ type: 'text', text })) },
      ],
    },
  });
}

/** Free-text send — delivered only inside an open 24h session window. */
export async function sendWhatsAppText(phone: string | null | undefined, body: string): Promise<boolean> {
  const to = normalizePkPhone(phone);
  if (!to) return false;
  return waPost({ to, type: 'text', text: { body } });
}
