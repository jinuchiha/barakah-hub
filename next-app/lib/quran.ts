interface DailyVerse {
  arabic: string;
  english: string;
  urdu: string;
  reference: string;
}

const VERSES: DailyVerse[] = [
  { arabic: 'مَّثَلُ ٱلَّذِينَ يُنفِقُونَ أَمْوَٰلَهُمْ فِى سَبِيلِ ٱللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ', english: 'The example of those who spend in the way of Allah is like a seed that grows seven spikes, in each spike a hundred grains.', urdu: 'جو لوگ اللہ کی راہ میں مال خرچ کرتے ہیں ان کی مثال اس دانے کی سی ہے جس سے سات بالیاں اگیں۔', reference: 'Al-Baqarah 2:261' },
  { arabic: 'وَمَا أَنفَقْتُم مِّن شَىْءٍ فَهُوَ يُخْلِفُهُۥ ۖ وَهُوَ خَيْرُ ٱلرَّٰزِقِينَ', english: 'Whatever you spend, He will replace it, and He is the best of providers.', urdu: 'اور جو کچھ تم خرچ کرتے ہو اللہ اس کا بدلہ دیتا ہے۔', reference: 'Saba 34:39' },
  { arabic: 'مَن ذَا ٱلَّذِى يُقْرِضُ ٱللَّهَ قَرْضًا حَسَنًا فَيُضَٰعِفَهُۥ لَهُۥٓ أَضْعَافًا كَثِيرَةً', english: 'Who is it that would loan Allah a goodly loan so He may multiply it for him many times over?', urdu: 'کون ہے جو اللہ کو قرض حسنہ دے تاکہ اللہ اسے کئی گنا بڑھا کر لوٹائے؟', reference: 'Al-Baqarah 2:245' },
  { arabic: 'وَأَقِيمُوا الصَّلَاةَ وَآتُوا الزَّكَاةَ وَأَطِيعُوا الرَّسُولَ لَعَلَّكُمْ تُرْحَمُونَ', english: 'Establish prayer and give zakah and obey the Messenger that you may receive mercy.', urdu: 'نماز قائم کرو، زکوٰة دو، اور رسول کی اطاعت کرو — تاکہ تم پر رحم کیا جائے۔', reference: 'An-Nur 24:56' },
  { arabic: 'إِنَّمَا ٱلْمُؤْمِنُونَ إِخْوَةٌ فَأَصْلِحُوا بَيْنَ أَخَوَيْكُمْ', english: 'The believers are but brothers, so make peace between your brothers.', urdu: 'مومن آپس میں بھائی بھائی ہیں، لہٰذا اپنے بھائیوں میں صلح کراؤ۔', reference: 'Al-Hujurat 49:10' },
  { arabic: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَى', english: 'Cooperate with one another in righteousness and piety.', urdu: 'نیکی اور تقویٰ میں ایک دوسرے کی مدد کرو۔', reference: 'Al-Maidah 5:2' },
  { arabic: 'خَيْرُ النَّاسِ أَنْفَعُهُمْ لِلنَّاسِ', english: 'The best of people are those who are most beneficial to people.', urdu: 'لوگوں میں سب سے بہتر وہ ہے جو لوگوں کو سب سے زیادہ فائدہ پہنچائے۔', reference: 'Hadith — Al-Mu\'jam al-Awsat' },
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
