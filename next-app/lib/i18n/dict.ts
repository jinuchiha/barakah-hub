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
  'tools.fitrana':    ['فطرانہ کیلکولیٹر', 'Fitrana Calculator'],
  'tools.qibla':      ['سمتِ قبلہ', 'Qibla Direction'],
  'tools.tasbeeh':    ['تسبیح کاؤنٹر', 'Tasbeeh Counter'],

  // Tree
  'tree.title':       ['خاندانی شجرہ', 'Family Tree'],
  'tree.hint':        ['شجرہ · کسی بھی رکن پر کلک کریں', 'Family tree · click any node to expand.'],

  // Settings
  'set.title':        ['ترتیبات', 'Settings'],
  'set.profile':      ['میری پروفائل', 'My Profile'],
  'set.theme':        ['تھیم اور ظاہری شکل', 'Theme & Appearance'],
  'set.adminConfig':  ['ایڈمن ترتیبات', 'Admin Configuration'],

  // Dashboard stats
  'ds.pendingApproval':  ['زیرِ منظوری رقم', 'Pending Approval'],
  'ds.activeMembers':    ['فعال اراکین', 'Active Members'],
  'ds.outstandingLoans': ['واجب الادا قرض', 'Outstanding Loans'],
  'ds.pendingVotes':     ['زیرِ التوا ووٹ', 'Pending Votes'],
  'ds.myTotalPaid':      ['میری کل ادائیگی', 'My Total Paid'],
  'ds.myMonthsPaid':     ['میرے ادا شدہ مہینے', 'My Months Paid'],
  'ds.familyFund':       ['خاندانی فنڈ', 'Family Fund'],
  'ds.hintApprovedFam':  ['منظور شدہ خاندان', 'Approved family'],
  'ds.hintActiveQarz':   ['فعال قرض', 'Active qarz'],
  'ds.hintCollective':   ['اجتماعی امانت', 'Collective trust'],

  // My Account extras
  'acct.activeLoans':   ['میرے فعال قرض', 'My Active Loans'],

  // Cases page + forms
  'case.submitNew':    ['نئی درخواست جمع کریں', 'Submit New Request'],
  'case.reason':       ['وجہ', 'Reason'],
  'case.beneficiary':  ['مستفید کا نام', 'Beneficiary name'],
  'case.amountNeeded': ['درکار رقم (روپے)', 'Amount needed (Rs.)'],
  'case.submit':       ['جمع کریں', 'Submit'],
  'case.emergencyFlag':['ہنگامی', 'Emergency'],
  'mem.verifyEmail':   ['ای میل تصدیق کریں', 'Verify email'],
  'mem.emailVerified': ['ای میل تصدیق ہو گئی · اب ممبر لاگ ان کر سکتا ہے', 'Email verified · the member can now sign in'],
  'case.newRequest':   ['+ نئی ہنگامی درخواست', '+ New Emergency Request'],
  'case.type':         ['قسم', 'Type'],
  'case.pool':         ['فنڈ پول', 'Pool'],
  'case.returnDate':   ['متوقع واپسی کی تاریخ', 'Expected Return Date'],
  'case.relation':     ['رشتہ', 'Relation'],
  'case.city':         ['شہر', 'City'],
  'case.relationPh':   ['مثلاً والدہ', 'e.g. Mother'],
  'case.reasonPh':     ['ضرورت بیان کریں · کسی بھی زبان میں', 'Describe the need · in any language'],
  'case.markUrgent':   ['فوری ہنگامی نشان لگائیں', 'Mark as urgent emergency'],
  'case.submitting':   ['جمع ہو رہی ہے…', 'Submitting…'],
  'case.submitReq':    ['درخواست جمع کریں', 'Submit Request'],
  'case.submitted':    ['جمع ہو گئی · ووٹنگ شروع', 'Submitted · voting open'],
  'case.cancel':       ['منسوخ', 'Cancel'],
  'case.disburse':     ['ادائیگی مکمل کریں', 'Mark Disbursed'],

  // Messages form
  'msg.toAdminLabel':  ['بنام (ایڈمن)', 'To (Admin)'],
  'msg.subjectLabel':  ['موضوع *', 'Subject *'],
  'msg.messageLabel':  ['پیغام *', 'Message *'],
  'msg.sendBtn':       ['بھیجیں', 'Send'],
  'msg.sending':       ['بھیجا جا رہا ہے…', 'Sending…'],

  // Goal bar
  'goal.title':        ['خاندانی ہدف', 'Family Goal'],
  'goal.of':           ['میں سے', 'of'],
  'goal.daysLeft':     ['دن باقی', 'days left'],
  'goal.reached':      ['الحمدللہ! ہدف مکمل', 'Goal reached · Alhamdulillah!'],

  // Topbar
  'top.search':        ['اراکین، ادائیگیاں، کیسز تلاش کریں…', 'Search members, payments, cases…'],

  // Admin fund
  'fund.title':          ['خاندانی فنڈ', 'Family Fund'],
  'fund.overline':       ['ایڈمن · فنڈ رجسٹر', 'Admin · Fund Register'],
  'fund.sadaqahPool':    ['صدقہ پول', 'Sadaqah Pool'],
  'fund.zakatPool':      ['زکوٰۃ پول', 'Zakat Pool'],
  'fund.qarzPool':       ['قرض پول', 'Qarz Pool'],
  'fund.monthlyInflow':  ['ماہانہ آمد', 'Monthly Inflow'],
  'fund.thisMonth':      ['اس مہینے', 'This Month'],
  'fund.contributed':    ['نے دیا', 'contributed'],
  'fund.recordPayment':  ['ادائیگی درج کریں', 'Record Payment'],
  'fund.history':        ['حالیہ تصدیق شدہ ادائیگیاں', 'Recent Verified Payments'],
  'fund.awaitingSup':    ['سپروائزر کی منظوری کے منتظر', 'Awaiting Supervisor'],
  'fund.awaitingAdmin':  ['سپروائزر سے منظور · آپ کی حتمی تصدیق', 'Supervisor-Approved · Awaiting Your Final'],
  'fund.export':         ['CSV ڈاؤن لوڈ', 'Export CSV'],

  // Admin members
  'mem.title':        ['اراکینِ خاندان', 'Family Members'],
  'mem.overline':     ['ایڈمن · اراکین', 'Admin · Members'],
  'mem.total':        ['کل اراکین', 'Total Members'],
  'mem.active':       ['فعال', 'Active'],
  'mem.pendingRev':   ['زیرِ جائزہ', 'Pending Review'],
  'mem.rejected':     ['مسترد', 'Rejected'],
  'mem.pendingReg':   ['نئی رجسٹریشنز', 'Pending Registrations'],
  'mem.approve':      ['منظور کریں', 'Approve'],
  'mem.reject':       ['مسترد کریں', 'Reject'],
  'mem.addMember':    ['نیا رکن', 'Add Member'],

  // Buttons/common extras
  'btn.submitVerification': ['تصدیق کے لیے جمع کریں', 'Submit for verification'],
  'btn.back':          ['← واپس', '← Back'],
  'btn.next':          ['اگلا ←', 'Next →'],

  // Toasts
  'toast.donationSubmitted': ['جمع ہو گیا · ایڈمن تصدیق کرے گا', 'Submitted · admin will verify'],
  'toast.approved':          ['منظور ہو گیا', 'Approved'],
  'toast.rejected':          ['مسترد کر دیا گیا', 'Rejected'],
  'toast.saved':             ['محفوظ ہو گیا', 'Saved'],
  'toast.messageSent':       ['پیغام بھیج دیا گیا', 'Message sent'],
  'toast.voteRecorded':      ['ووٹ درج ہو گیا · جزاکم اللہ', 'Vote recorded · جزاکم اللہ'],

  // Empty states
  'empty.payments':   ['ابھی کوئی ادائیگی نہیں', 'No payments yet'],
  'empty.inbox':      ['کوئی پیغام نہیں', 'Inbox empty'],
  'empty.cases':      ['الحمدللہ · اس وقت سب خیریت ہے', 'No emergency cases yet'],
  'empty.caughtUp':   ['سب دیکھ لیا · کوئی اطلاع نہیں', 'All caught up'],

  // Loans page (admin)
  'loan.title':       ['قرض حسنہ', 'Qarz-e-Hasana'],
  'loan.overline':    ['ایڈمن · قرضے', 'Admin · Loans'],
  'loan.active':      ['فعال قرضے', 'Active Loans'],
  'loan.settled':     ['ادا شدہ', 'Settled'],
  'loan.disbursedTotal': ['کل جاری کردہ', 'Total Disbursed'],
  'loan.issue':       ['قرض جاری کریں', 'Issue Qarz-e-Hasana'],
  'loan.repay':       ['قسط درج کریں', 'Record Repayment'],
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
