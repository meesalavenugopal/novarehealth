import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptTranslations from './locales/pt.json';
import enTranslations from './locales/en.json';

const resources = {
  pt: {
    translation: ptTranslations
  },
  en: {
    translation: enTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'pt', // Portuguese as default
    lng: localStorage.getItem('language') || 'pt', // Check saved preference
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language'
    },

    interpolation: {
      escapeValue: false // React already escapes values
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;

// Helper to change language
export const changeLanguage = (lng: 'pt' | 'en') => {
  localStorage.setItem('language', lng);
  i18n.changeLanguage(lng);
};

// Get current language
export const getCurrentLanguage = () => i18n.language;
