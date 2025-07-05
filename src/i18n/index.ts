import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ja from "./locales/ja.json";
import type { Language } from "@/types";

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            ja: { translation: ja },
        },
        fallbackLng: "ja",
        debug: import.meta.env.DEV,
        interpolation: {
            escapeValue: false,
        },
        lng: "ja",
    });

export const setLanguage = (language: Language) => {
    i18n.changeLanguage(language);
};

export default i18n;