import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../../locales/en.json";
import es from "../../locales/es.json";

export const LANGUAGES = ["en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];

const STORAGE_KEY = "billetera.language";

function isLanguage(value: string | null | undefined): value is Language {
  return LANGUAGES.includes(value as Language);
}

function readStoredLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // The choice just won't survive a reload.
  }
}

function initialLanguage(): Language {
  const stored = readStoredLanguage();
  if (isLanguage(stored)) {
    return stored;
  }
  const browser = globalThis.navigator?.language?.split("-")[0];
  return isLanguage(browser) ? browser : "en";
}

function syncDocumentLanguage(language: string) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
}

i18n.on("languageChanged", syncDocumentLanguage);

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, es: { translation: es } },
  lng: initialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(language: Language) {
  storeLanguage(language);
  i18n.changeLanguage(language);
}

export default i18n;
