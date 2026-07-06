/**
 * Duas and ayat shown to a member right after they give sadqa.
 * Every entry is sourced — Qur'an surah:ayah or hadith collection —
 * so the reward message is authentic, not invented.
 */
export interface Dua {
  arabic: string;
  urdu: string;
  english: string;
  source: string;
}

export const SADQA_DUAS: readonly Dua[] = [
  {
    arabic: 'مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ',
    urdu: 'جو لوگ اللہ کی راہ میں خرچ کرتے ہیں ان کی مثال اُس دانے کی سی ہے جس سے سات بالیاں اُگیں',
    english: 'The example of those who spend in the way of Allah is like a seed that grows seven ears.',
    source: 'Al-Baqarah 2:261',
  },
  {
    arabic: 'اللَّهُمَّ أَعْطِ مُنْفِقًا خَلَفًا',
    urdu: 'اے اللہ! خرچ کرنے والے کو اس کا بدل عطا فرما',
    english: 'O Allah, grant the one who spends a replacement.',
    source: 'Sahih al-Bukhari 1442',
  },
  {
    arabic: 'الصَّدَقَةُ تُطْفِئُ الْخَطِيئَةَ كَمَا يُطْفِئُ الْمَاءُ النَّارَ',
    urdu: 'صدقہ گناہ کو ایسے بجھا دیتا ہے جیسے پانی آگ کو بجھاتا ہے',
    english: 'Charity extinguishes sin as water extinguishes fire.',
    source: 'Jami at-Tirmidhi 614',
  },
  {
    arabic: 'مَا نَقَصَتْ صَدَقَةٌ مِنْ مَالٍ',
    urdu: 'صدقہ مال کو کبھی کم نہیں کرتا',
    english: 'Charity does not decrease wealth.',
    source: 'Sahih Muslim 2588',
  },
  {
    arabic: 'وَمَا أَنفَقْتُم مِّن شَيْءٍ فَهُوَ يُخْلِفُهُ ۖ وَهُوَ خَيْرُ الرَّازِقِينَ',
    urdu: 'اور جو کچھ تم خرچ کرو گے وہ اس کا بدلہ دے گا، اور وہ سب سے بہتر رزق دینے والا ہے',
    english: 'Whatever you spend, He will replace it; and He is the best of providers.',
    source: 'Saba 34:39',
  },
  {
    arabic: 'كُلُّ امْرِئٍ فِي ظِلِّ صَدَقَتِهِ حَتَّى يُفْصَلَ بَيْنَ النَّاسِ',
    urdu: 'قیامت کے دن ہر شخص اپنے صدقے کے سائے میں ہو گا',
    english: 'Every person will be in the shade of their charity on the Day of Judgement.',
    source: 'Musnad Ahmad 17333',
  },
  {
    arabic: 'إِن تُبْدُوا الصَّدَقَاتِ فَنِعِمَّا هِيَ ۖ وَإِن تُخْفُوهَا وَتُؤْتُوهَا الْفُقَرَاءَ فَهُوَ خَيْرٌ لَّكُمْ',
    urdu: 'اگر تم صدقہ ظاہر کر کے دو تو اچھا ہے، اور اگر چھپا کر فقیروں کو دو تو تمہارے لیے اور بہتر ہے',
    english: 'If you disclose charity, it is good; but if you conceal it and give to the poor, it is better for you.',
    source: 'Al-Baqarah 2:271',
  },
  {
    arabic: 'دَاوُوا مَرْضَاكُمْ بِالصَّدَقَةِ',
    urdu: 'اپنے بیماروں کا علاج صدقے سے کرو',
    english: 'Treat your sick with charity.',
    source: 'Sunan Abi Dawud (graded hasan)',
  },
  {
    arabic: 'اتَّقُوا النَّارَ وَلَوْ بِشِقِّ تَمْرَةٍ',
    urdu: 'آگ سے بچو، خواہ کھجور کے ایک ٹکڑے ہی سے',
    english: 'Guard yourself against the Fire, even with half a date in charity.',
    source: 'Sahih al-Bukhari 1417',
  },
  {
    arabic: 'وَمَا تُنفِقُوا مِنْ خَيْرٍ يُوَفَّ إِلَيْكُمْ وَأَنتُمْ لَا تُظْلَمُونَ',
    urdu: 'اور جو مال تم خرچ کرو گے وہ تمہیں پورا پورا لوٹا دیا جائے گا اور تم پر ظلم نہ ہو گا',
    english: 'Whatever good you spend will be fully repaid to you, and you will not be wronged.',
    source: 'Al-Baqarah 2:272',
  },
  {
    arabic: 'صَنَائِعُ الْمَعْرُوفِ تَقِي مَصَارِعَ السُّوءِ',
    urdu: 'نیکی کے کام بری موت اور مصیبتوں سے بچاتے ہیں',
    english: 'Acts of goodness protect from evil ends.',
    source: 'Al-Mu\'jam al-Awsat (Tabarani)',
  },
  {
    arabic: 'يَمْحَقُ اللَّهُ الرِّبَا وَيُرْبِي الصَّدَقَاتِ',
    urdu: 'اللہ سود کو مٹاتا ہے اور صدقات کو بڑھاتا ہے',
    english: 'Allah destroys interest and gives increase for charities.',
    source: 'Al-Baqarah 2:276',
  },
];

export function randomDua(): Dua {
  return SADQA_DUAS[Math.floor(Math.random() * SADQA_DUAS.length)];
}
