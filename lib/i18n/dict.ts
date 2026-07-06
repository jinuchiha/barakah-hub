/**
 * Tiny i18n · a key → [ur, en] dictionary.
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
  'common.verified':  ['تصدیق شدہ', 'Verified'],
  'common.pending':   ['زیرِ التوا', 'Pending'],
  'common.rejected':  ['مسترد', 'Rejected'],
  'common.active':    ['فعال', 'Active'],
  'common.settled':   ['ادا شدہ', 'Settled'],
  'common.fullHistory': ['مکمل ریکارڈ ←', 'Full history →'],
  'common.date':      ['تاریخ', 'Date'],
  'common.month':     ['مہینہ', 'Month'],
  'common.amount':    ['رقم', 'Amount'],
  'common.status':    ['حیثیت', 'Status'],
  'common.note':      ['نوٹ', 'Note'],

  // Dashboard
  'dash.title':            ['ڈیش بورڈ', 'Dashboard'],
  'dash.welcome':          ['خوش آمدید', 'Welcome'],
  'dash.totalFamilyFund':  ['کل خاندانی فنڈ · لائیو', 'Total Family Fund · Live'],
  'dash.awaitingApproval': ['منظوری کے منتظر', 'awaiting approval'],
  'dash.recentActivity':   ['میری حالیہ ادائیگیاں', 'My Recent Contributions'],
  'dash.noContributions':  ['ابھی کوئی ادائیگی نہیں · اپنا پہلا صدقہ جمع کریں', 'No contributions yet · submit your first donation'],
  'dash.communityFeed':    ['خاندان کی سرگرمی', 'Community Activity'],
  'dash.openCases':        ['کھلے کیسز', 'Open Cases'],
  'dash.myLoans':          ['میرے قرض', 'My Loans'],

  // My Account
  'acct.title':          ['میرا کھاتہ', 'My Account'],
  'acct.overline':       ['رکن · کھاتہ', 'Member · Account'],
  'acct.submitDonation': ['صدقہ جمع کریں', 'Submit a Donation'],
  'acct.paymentHistory': ['میری ادائیگیوں کا ریکارڈ', 'My Payment History'],
  'acct.downloadStatement': ['↓ اپنا گوشوارہ ڈاؤن لوڈ کریں (CSV)', '↓ Download my statement (CSV)'],
  'acct.verifiedTotal':  ['تصدیق شدہ کل', 'Verified Total'],
  'acct.pendingTotal':   ['زیرِ التوا رقم', 'Pending Amount'],
  'acct.noPayments':     ['ابھی کوئی ادائیگی نہیں · پہلا صدقہ جمع کر کے شرکت کریں', 'No payments yet · submit your first donation to start contributing.'],

  // Donation form
  'don.button':        ['+ صدقہ جمع کریں', '+ Submit Donation'],
  'don.amount':        ['رقم (روپے) *', 'Amount (Rs.) *'],
  'don.pool':          ['مد', 'Pool'],
  'don.month':         ['مہینہ', 'Month'],
  'don.noteOptional':  ['نوٹ (اختیاری)', 'Note (optional)'],
  'don.attachReceipt': ['رسید کا اسکرین شاٹ لگائیں (اختیاری)', 'Attach receipt screenshot (optional)'],
  'don.receiptAttached': ['رسید منسلک ہے', 'Receipt attached'],
  'don.uploading':     ['اپ لوڈ ہو رہی ہے…', 'Uploading…'],
  'don.submit':        ['تصدیق کے لیے جمع کریں', 'Submit for verification'],
  'don.submitting':    ['جمع ہو رہا ہے…', 'Submitting…'],
  'don.easypaisa':     ['ایزی پیسہ سے ادائیگی بھیجیں', 'Send Payment Via EasyPaisa'],

  // Cases
  'case.title':       ['ایمرجنسی کیسز', 'Emergency Cases'],
  'case.overline':    ['برادری · ووٹنگ', 'Community · Voting'],
  'case.newCase':     ['+ نیا کیس', '+ New Case'],
  'case.voteYes':     ['✓ حق میں', '✓ Yes'],
  'case.voteNo':      ['✗ مخالفت', '✗ No'],
  'case.voted':       ['آپ ووٹ دے چکے ہیں', 'You have voted'],
  'case.ownRequest':  ['اپنی درخواست · خود ووٹ نہیں دے سکتے', 'Your own request · cannot self-vote.'],
  'case.noCases':     ['الحمدللہ · اس وقت سب خیریت ہے', 'No emergency cases yet'],
  'case.requested':   ['درخواست کردہ رقم', 'requested'],

  // Notifications
  'notif.title':      ['اطلاعات', 'Notifications'],
  'notif.markAll':    ['✓ سب پڑھی ہوئی کریں', '✓ Mark all read'],
  'notif.empty':      ['کوئی اطلاع نہیں', 'No notifications yet'],

  // Messages
  'msg.title':        ['پیغامات', 'Messages'],
  'msg.send':         ['بھیجیں', 'Send'],
  'msg.subject':      ['موضوع', 'Subject'],
  'msg.message':      ['پیغام', 'Message'],
  'msg.toAdmin':      ['بنام (ایڈمن)', 'To (Admin)'],
  'msg.inbox':        ['موصولہ پیغامات', 'Inbox'],
  'msg.empty':        ['کوئی پیغام نہیں', 'No messages yet'],

  // Tools
  'tools.title':      ['اسلامی ٹولز', 'Islamic Tools'],
  'tools.hijri':      ['ہجری تاریخ', 'Hijri Date'],
  'tools.hijriSub':   ['آج اسلامی کیلنڈر میں', 'Today in the Islamic calendar'],
  'tools.prayer':     ['اوقاتِ نماز', 'Prayer Times'],
  'tools.zakat':      ['زکوٰۃ کیلکولیٹر', 'Zakat Calculator'],
  'tools.verse':      ['آج کی آیت', 'Daily Verse'],

  // Tree
  'tree.title':       ['خاندانی شجرہ', 'Family Tree'],
  'tree.hint':        ['شجرہ · کسی بھی رکن پر کلک کریں', 'Family tree · click any node to expand.'],

  // Settings
  'set.title':        ['ترتیبات', 'Settings'],
  'set.profile':      ['میری پروفائل', 'My Profile'],
  'set.theme':        ['تھیم اور ظاہری شکل', 'Theme & Appearance'],
  'set.adminConfig':  ['ایڈمن ترتیبات', 'Admin Configuration'],
} as const;

export type Locale = 'ur' | 'en';
export type DictKey = keyof typeof DICT;

/** Read a key in the given locale. */
export function t(key: DictKey, locale: Locale = 'en'): string {
  const entry = DICT[key];
  if (!entry) return key;
  return locale === 'ur' ? entry[0] : entry[1];
}

/** Helper for "Welcome · Ahmad" style strings. */
export function tWith(key: DictKey, locale: Locale, suffix: string): string {
  return `${t(key, locale)} · ${suffix}`;
}

/** Currency formatter · Pakistani Rupees (South Asian 2-2-3 grouping: 1,00,000). */
export function fmtRs(n: number): string {
  const abs = Math.abs(n || 0);
  const fmt = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(abs);
  return (n < 0 ? '-' : '') + 'Rs. ' + fmt;
}
