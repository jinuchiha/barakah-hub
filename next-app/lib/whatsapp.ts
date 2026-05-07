/**
 * WhatsApp deep-link generators with auto Pakistan country-code normalization
 * + pre-formatted bilingual Urdu messages (Bismillah + greeting + closing dua).
 */
import { normalizePkPhone } from '@/lib/utils';
import { fmtRs } from '@/lib/i18n/dict';
import type { Member } from '@/lib/db/schema';

const BISMILLAH = 'بسم اللہ الرحمن الرحیم';
const CLOSING = '\n\nجزاک اللہ خیر — بیت المال بلوچ ساتھ';

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
    'سدقہ بلاؤں کو ٹال دیتا ہے',
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
