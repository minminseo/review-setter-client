import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ja from "./locales/ja.json";
import type { Language } from "@/types";

i18n
    // react-i18nextをi18nextに接続
    .use(initReactI18next)
    .init({
        // 翻訳リソース
        resources: {
            en: { translation: en },
            ja: { translation: ja },
        },
        // 対応する言語がない場合のフォールバック言語
        fallbackLng: "ja",
        // 開発時にデバッグ情報をコンソールに出力
        debug: import.meta.env.DEV,
        interpolation: {
            // ReactはデフォルトでXSS対策済みなので、エスケープは不要
            escapeValue: false,
        },
        // 言語検出を無効にし、手動で制御
        lng: "ja", // デフォルト言語
    });

// Zustandから言語を設定するためのヘルパー関数
export const setLanguage = (language: Language) => {
    i18n.changeLanguage(language);
};

export default i18n;