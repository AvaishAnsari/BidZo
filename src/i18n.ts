import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslation from "./locales/en/translation.json";
import hiTranslation from "./locales/hi/translation.json";
import knTranslation from "./locales/kn/translation.json";
import urTranslation from "./locales/ur/translation.json";

const resources = {
  en: { translation: enTranslation },
  hi: { translation: hiTranslation },
  kn: { translation: knTranslation },
  ur: { translation: urTranslation },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("i18nextLng") || "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
