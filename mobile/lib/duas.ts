/**
 * Ayat, hadith, and duas shown to a member right after they give sadqa.
 *
 * Content rules (do not relax when editing):
 *  · Every entry carries a `type` so the UI can label Qur'an, hadith, and
 *    dua distinctly — scripture must never be presented as a supplication.
 *  · Every entry is sourced: Qur'an surah:ayah, or hadith collection WITH
 *    number. A narration whose authenticity is contested does not belong
 *    here — there is no shortage of sahih material on charity.
 *  · Arabic is quoted exactly; the translation must not say more than the
 *    quoted Arabic does.
 */
export type DuaKind = 'quran' | 'hadith' | 'dua';

export interface Dua {
  type: DuaKind;
  arabic: string;
  urdu: string;
  english: string;
  source: string;
}

/** UI labels for each content kind, so consumers stay consistent. */
export const DUA_KIND_LABEL: Record<DuaKind, { en: string; ur: string }> = {
  quran: { en: "Qur'an", ur: 'قرآن' },
  hadith: { en: 'Hadith', ur: 'حدیث' },
  dua: { en: 'Dua', ur: 'دعا' },
};

export const SADQA_DUAS: readonly Dua[] = [
  {
    type: 'quran',
    arabic: 'مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ',
    urdu: 'جو لوگ اللہ کی راہ میں خرچ کرتے ہیں ان کی مثال اُس دانے کی سی ہے جس سے سات بالیاں اُگیں',
    english: 'The example of those who spend in the way of Allah is like a seed that grows seven ears.',
    source: 'Al-Baqarah 2:261',
  },
  {
    type: 'dua',
    arabic: 'اللَّهُمَّ أَعْطِ مُنْفِقًا خَلَفًا',
    urdu: 'اے اللہ! خرچ کرنے والے کو اس کا بدل عطا فرما',
    english: 'O Allah, grant the one who spends a replacement.',
    source: 'Sahih al-Bukhari 1442',
  },
  {
    type: 'hadith',
    arabic: 'الصَّدَقَةُ تُطْفِئُ الْخَطِيئَةَ كَمَا يُطْفِئُ الْمَاءُ النَّارَ',
    urdu: 'صدقہ گناہ کو ایسے بجھا دیتا ہے جیسے پانی آگ کو بجھاتا ہے',
    english: 'Charity extinguishes sin as water extinguishes fire.',
    source: 'Jami at-Tirmidhi 614 · sahih (al-Albani)',
  },
  {
    type: 'hadith',
    arabic: 'مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ',
    urdu: 'صدقہ مال کو کبھی کم نہیں کرتا',
    english: 'Charity does not decrease wealth.',
    source: 'Sahih Muslim 2588',
  },
  {
    type: 'quran',
    arabic: 'وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ ۖ وَهُوَ خَيْرُ الرَّازِقِينَ',
    urdu: 'اور جو کچھ تم خرچ کرو گے وہ اس کا بدلہ دے گا، اور وہ سب سے بہتر رزق دینے والا ہے',
    english: 'Whatever you spend, He will replace it; and He is the best of providers.',
    source: 'Saba 34:39',
  },
  {
    type: 'hadith',
    arabic: 'كُلُّ امْرِئٍ فِي ظِلِّ صَدَقَتِهِ حَتَّى يُفْصَلَ بَيْنَ النَّاسِ',
    urdu: 'قیامت کے دن ہر شخص اپنے صدقے کے سائے میں ہو گا',
    english: 'Every person will be in the shade of their charity on the Day of Judgement.',
    source: 'Musnad Ahmad 17333 · graded sahih by al-Albani',
  },
  {
    type: 'quran',
    arabic: 'إِن تُبْدُوا الصَّدَقَاتِ فَنِعِمَّا هِيَ ۖ وَإِن تُخْفُوهَا وَتُؤْتُوهَا الْفُقَرَاءَ فَهُوَ خَيْرٌ لَّكُمْ',
    urdu: 'اگر تم صدقہ ظاہر کر کے دو تو اچھا ہے، اور اگر چھپا کر فقیروں کو دو تو تمہارے لیے اور بہتر ہے',
    english: 'If you disclose charity, it is good; but if you conceal it and give to the poor, it is better for you.',
    source: 'Al-Baqarah 2:271',
  },
  {
    type: 'hadith',
    arabic: 'كُلُّ مَعْرُوفٍ صَدَقَةٌ',
    urdu: 'ہر نیکی صدقہ ہے',
    english: 'Every act of goodness is charity.',
    source: 'Sahih al-Bukhari 6021',
  },
  {
    type: 'hadith',
    arabic: 'اتَّقُوا النَّارَ وَلَوْ بِشِقِّ تَمْرَةٍ',
    urdu: 'آگ سے بچو، خواہ کھجور کے ایک ٹکڑے ہی سے',
    english: 'Guard yourself against the Fire, even with half a date in charity.',
    source: 'Sahih al-Bukhari 1417',
  },
  {
    type: 'quran',
    arabic: 'وَمَا تُنفِقُوا مِنْ خَيْرٍ يُوَفَّ إِلَيْكُمْ وَأَنتُمْ لَا تُظْلَمُونَ',
    urdu: 'اور جو مال تم خرچ کرو گے وہ تمہیں پورا پورا لوٹا دیا جائے گا اور تم پر ظلم نہ ہو گا',
    english: 'Whatever good you spend will be fully repaid to you, and you will not be wronged.',
    source: 'Al-Baqarah 2:272',
  },
  {
    type: 'hadith',
    arabic: 'مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ',
    urdu: 'جو کسی مومن کی دنیا کی مصیبتوں میں سے کوئی مصیبت دور کرے، اللہ قیامت کے دن اس کی کوئی مصیبت دور فرمائے گا',
    english: 'Whoever relieves a believer of a hardship of this world, Allah will relieve them of a hardship on the Day of Resurrection.',
    source: 'Sahih Muslim 2699',
  },
  {
    type: 'quran',
    arabic: 'يَمْحَقُ اللَّهُ الرِّبَا وَيُرْبِي الصَّدَقَاتِ',
    urdu: 'اللہ سود کو مٹاتا ہے اور صدقات کو بڑھاتا ہے',
    english: 'Allah destroys interest and gives increase for charities.',
    source: 'Al-Baqarah 2:276',
  },
];

export function randomDua(): Dua {
  return SADQA_DUAS[Math.floor(Math.random() * SADQA_DUAS.length)];
}
