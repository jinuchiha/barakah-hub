/**
 * Tiny i18n — a key → [ur, en] dictionary.
 * Hooks into Server Components via `getDictionary(locale)`.
 *
 * For ICU MessageFormat / pluralization, swap to `next-intl` later.
 */
export const DICT = {
  // Nav
  'nav.dashboard':    ['ڈیش بورڈ', 'Dashboard'],
  'nav.myaccount':    ['میرا کھاتہ', 'My Account'],
  'nav.tree':         ['خاندانی درخت', 'Family Tree'],
  'nav.cases':        ['ایمرجنسی ووٹ', 'Emergency Vote'],
  'nav.notifications':['اطلاعات', 'Notifications'],
  'nav.messages':     ['پیغامات', 'Messages'],
  'nav.settings':     ['ترتیبات', 'Settings'],
  'nav.members':      ['اراکین', 'Members'],
  'nav.fund':         ['فنڈ رجسٹر', 'Fund Register'],
  'nav.loans':        ['قرض حسنہ', 'Qarz-e-Hasana'],
  'nav.broadcast':    ['اعلان', 'Broadcast'],
  'nav.audit':        ['آڈٹ لاگ', 'Audit Log'],

  // Stats
  'stat.totalFund':         ['کل جمع فنڈ', 'Total Fund'],
  'stat.members':           ['اراکین', 'Members'],
  'stat.outstandingLoans':  ['قرض واجب', 'Outstanding Loans'],
  'stat.pendingVotes':      ['ایمرجنسی ووٹنگ', 'Pending Votes'],
  'stat.myTotalPaid':       ['میری کل ادائیگی', 'My Total Paid'],
  'stat.monthsPaid':        ['ادا کیے مہینے', 'Months Paid'],
  'stat.thisMonth':         ['اس ماہ', 'This Month'],
  'stat.familyFund':        ['خاندانی فنڈ', 'Family Fund'],

  // Auth
  'auth.login':       ['داخل ہوں', 'Login'],
  'auth.username':    ['صارف نام', 'Username'],
  'auth.password':    ['پاس ورڈ', 'Password'],
  'auth.welcome':     ['خوش آمدید', 'Welcome'],
  'auth.forgotPassword':['پاس ورڈ بھول گئے؟', 'Forgot password?'],
  'auth.invalid':     ['غلط معلومات', 'Invalid credentials'],

  // Common
  'common.save':      ['محفوظ کریں', 'Save'],
  'common.cancel':    ['منسوخ', 'Cancel'],
  'common.delete':    ['حذف', 'Delete'],
  'common.edit':      ['ترمیم', 'Edit'],
  'common.confirm':   ['تصدیق', 'Confirm'],
  'common.loading':   ['لوڈ ہو رہا ہے...', 'Loading...'],
  'common.empty':     ['کوئی ڈیٹا نہیں', 'No data yet'],
} as const;

export type Locale = 'ur' | 'en';
export type DictKey = keyof typeof DICT;

/** Read a key in the given locale. */
export function t(key: DictKey, locale: Locale = 'en'): string {
  const entry = DICT[key];
  if (!entry) return key;
  return locale === 'ur' ? entry[0] : entry[1];
}

/** Helper for "Welcome — Ahmad" style strings. */
export function tWith(key: DictKey, locale: Locale, suffix: string): string {
  return `${t(key, locale)} — ${suffix}`;
}

/** Currency formatter — Pakistani Rupees. */
export function fmtRs(n: number): string {
  return 'Rs. ' + (n || 0).toLocaleString('en-PK');
}
