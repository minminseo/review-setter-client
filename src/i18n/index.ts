import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import ja from "./locales/ja.json";

i18n
    // react-i18nextをi18nextに接続
    .use(initReactI18next)
    // ブラウザの言語設定を自動で検知するプラグイン
    .use(LanguageDetector)
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
        // 言語検出の順序とキャッシュ場所
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
        },
    });

export default i18n;