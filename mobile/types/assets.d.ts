declare module '@/assets/daily-content.json' {
  export interface DailyContent {
    arabic: string;
    english: string;
    urdu: string;
    reference: string;
    type: 'verse' | 'hadith';
  }
  const content: { verses: DailyContent[] };
  export default content;
}
