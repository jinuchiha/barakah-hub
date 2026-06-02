import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';
import en from '@/locales/en.json';
import ur from '@/locales/ur.json';
import ar from '@/locales/ar.json';
import ps from '@/locales/ps.json';
import { getLanguage } from './storage';

// Supported languages — Hindi (hi) and Sindhi (sd) removed at user
// request. The translation files are kept in /locales for now in case
// they're re-enabled later, but they are not imported / wired here.
export type SupportedLanguage = 'en' | 'ur' | 'ar' | 'ps';

export const RTL_LANGUAGES: ReadonlySet<SupportedLanguage> = new Set(['ur', 'ar', 'ps']);

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
  { code: 'ps', nativeName: 'پښتو', englishName: 'Pashto', flag: '🇦🇫', rtl: true },
];

let initialized = false;

function detectDeviceLanguage(): SupportedLanguage {
  const locales = Localization.getLocales();
  const tag = locales[0]?.languageTag ?? 'en';
  const lang = tag.split('-')[0] as SupportedLanguage;
  const supported: SupportedLanguage[] = ['en', 'ur', 'ar', 'ps'];
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
  // If a previously-stored language is now unsupported (e.g. user had
  // 'hi' or 'sd' set before we removed them), fall back to device or 'en'.
  const supported: SupportedLanguage[] = ['en', 'ur', 'ar', 'ps'];
  const validStored = stored && supported.includes(stored as SupportedLanguage) ? stored : null;
  const lang = (validStored ?? (detectDeviceLanguage() as string)) as SupportedLanguage;

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
      ar: { translation: ar },
      ps: { translation: ps },
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
