export interface DailyVerse {
  arabic: string;
  english: string;
  urdu: string;
  reference: string;
  type: 'verse' | 'hadith';
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const dailyContent = require('@/assets/daily-content.json') as { verses: DailyVerse[] };

function getDayIndex(verses: DailyVerse[]): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return dayOfYear % verses.length;
}

export function getDailyVerse(): DailyVerse {
  const { verses } = dailyContent;
  return verses[getDayIndex(verses)];
}

/** Index of today's verse — the live card starts here, then cycles. */
getDailyVerse.index = (): number => getDayIndex(dailyContent.verses);

export function getVerseAt(index: number): DailyVerse {
  const { verses } = dailyContent;
  return verses[((index % verses.length) + verses.length) % verses.length];
}

export function verseCount(): number {
  return dailyContent.verses.length;
}
