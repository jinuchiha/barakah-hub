import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import ur from '@/locales/ur.json';
import { getLanguage } from './storage';

let initialized = false;

export async function initI18n(): Promise<void> {
  if (initialized) return;
  const lang = await getLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
    },
    lng: lang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v3',
  });

  initialized = true;
}

export function changeLanguage(lang: 'en' | 'ur'): void {
  i18n.changeLanguage(lang);
}

export default i18n;
