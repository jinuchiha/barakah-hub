import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import en from '@/locales/en.json';
import ur from '@/locales/ur.json';
import ar from '@/locales/ar.json';
import hi from '@/locales/hi.json';
import ps from '@/locales/ps.json';
import sd from '@/locales/sd.json';
import { getLanguage } from './storage';

export type SupportedLanguage = 'en' | 'ur' | 'ar' | 'hi' | 'ps' | 'sd';

export const RTL_LANGUAGES: ReadonlySet<SupportedLanguage> = new Set(['ur', 'ar', 'ps', 'sd']);

export interface LanguageMeta {
  code: SupportedLanguage;
  nativeName: string;
  englishName: string;
  flag: string;
  rtl: boolean;
}

export const LANGUAGES: LanguageMeta[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', flag: '🇬🇧', rtl: false },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', flag: '🇵🇰', rtl: true },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', flag: '🇸🇦', rtl: true },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', flag: '🇮🇳', rtl: false },
  { code: 'ps', nativeName: 'پښتو', englishName: 'Pashto', flag: '🇦🇫', rtl: true },
  { code: 'sd', nativeName: 'سنڌي', englishName: 'Sindhi', flag: '🇵🇰', rtl: true },
];

let initialized = false;

function detectDeviceLanguage(): SupportedLanguage {
  const locales = Localization.getLocales();
  const tag = locales[0]?.languageTag ?? 'en';
  const lang = tag.split('-')[0] as SupportedLanguage;
  const supported: SupportedLanguage[] = ['en', 'ur', 'ar', 'hi', 'ps', 'sd'];
  return supported.includes(lang) ? lang : 'en';
}

export function applyRTL(lang: SupportedLanguage): void {
  const isRTL = RTL_LANGUAGES.has(lang);
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
  }
}

export async function initI18n(): Promise<void> {
  if (initialized) return;
  const stored = await getLanguage();
  const lang = (stored && stored !== 'en' ? stored : detectDeviceLanguage()) as SupportedLanguage;

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
      ar: { translation: ar },
      hi: { translation: hi },
      ps: { translation: ps },
      sd: { translation: sd },
    },
    lng: lang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v3',
  });

  applyRTL(lang);
  initialized = true;
}

export function changeLanguage(lang: SupportedLanguage): void {
  i18n.changeLanguage(lang);
  applyRTL(lang);
}

export function isRTL(lang: SupportedLanguage): boolean {
  return RTL_LANGUAGES.has(lang);
}

export default i18n;
