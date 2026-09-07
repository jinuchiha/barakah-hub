/**
 * Daily verse/hadith pool for the tools page.
 *
 * Content rules: every entry is typed ('verse' | 'hadith') so the UI never
 * labels a hadith as an ayah; every translation matches the quoted Arabic
 * exactly — no translating text that is not quoted. A trailing … marks a
 * quotation that stops before the end of the ayah.
 */
export interface DailyVerse {
  type: 'verse' | 'hadith';
  arabic: string;
  english: string;
  urdu: string;
  reference: string;
}

/** Exported so the religious-content test can audit these citations too. */
export const VERSES: DailyVerse[] = [
  { type: 'verse', arabic: 'مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ…', english: 'The example of those who spend in the way of Allah is like a seed that grows seven ears…', urdu: 'جو لوگ اللہ کی راہ میں مال خرچ کرتے ہیں ان کی مثال اس دانے کی سی ہے جس سے سات بالیاں اگیں…', reference: 'Al-Baqarah 2:261' },
  { type: 'verse', arabic: 'وَمَا أَنفَقْتُم مِّن شَىْءٍ فَهُوَ يُخْلِفُهُۥ ۖ وَهُوَ خَيْرُ ٱلرَّٰزِقِينَ', english: 'Whatever you spend, He will replace it, and He is the best of providers.', urdu: 'اور جو کچھ تم خرچ کرتے ہو وہ اس کا بدلہ دیتا ہے، اور وہ سب سے بہتر رزق دینے والا ہے۔', reference: 'Saba 34:39' },
  { type: 'verse', arabic: 'مَن ذَا ٱلَّذِى يُقْرِضُ ٱللَّهَ قَرْضًا حَسَنًا فَيُضَٰعِفَهُۥ لَهُۥٓ أَضْعَافًا كَثِيرَةً…', english: 'Who is it that would loan Allah a goodly loan so He may multiply it for him many times over?', urdu: 'کون ہے جو اللہ کو قرض حسنہ دے تاکہ اللہ اسے کئی گنا بڑھا کر لوٹائے؟', reference: 'Al-Baqarah 2:245' },
  { type: 'verse', arabic: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَأَطِيعُوا الرَّسُولَ لَعَلَّكُمْ تُرْحَمُونَ', english: 'Establish prayer and give zakah and obey the Messenger that you may receive mercy.', urdu: 'نماز قائم کرو، زکوٰة دو، اور رسول کی اطاعت کرو تاکہ تم پر رحم کیا جائے۔', reference: 'An-Nur 24:56' },
  { type: 'verse', arabic: 'إِنَّمَا ٱلْمُؤْمِنُونَ إِخْوَةٌ فَأَصْلِحُوا بَيْنَ أَخَوَيْكُمْ…', english: 'The believers are but brothers, so make peace between your brothers…', urdu: 'مومن آپس میں بھائی بھائی ہیں، لہٰذا اپنے بھائیوں میں صلح کراؤ…', reference: 'Al-Hujurat 49:10' },
  { type: 'verse', arabic: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ…', english: 'Cooperate with one another in righteousness and piety…', urdu: 'نیکی اور تقویٰ میں ایک دوسرے کی مدد کرو…', reference: "Al-Ma'idah 5:2" },
  { type: 'hadith', arabic: 'لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ', english: 'None of you truly believes until he loves for his brother what he loves for himself.', urdu: 'تم میں سے کوئی اس وقت تک مومن نہیں ہو سکتا جب تک اپنے بھائی کے لیے وہی پسند نہ کرے جو اپنے لیے کرتا ہے۔', reference: 'Sahih al-Bukhari 13' },
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

export function getDailyVerse(): DailyVerse {
  return VERSES[getDayOfYear() % VERSES.length];
}
