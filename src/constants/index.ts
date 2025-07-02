import { ThemeColor, Language } from "@/types";

// Goのドメイン層で定義されている選択肢と一致させる
export const THEME_COLORS: { value: ThemeColor; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
];

export const LANGUAGES: { value: Language; label: string }[] = [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
];

// サインアップ画面で選択可能なタイムゾーンのリスト
// 将来的にユーザーが選択肢を増やせるように、ここで一元管理する
export const TIMEZONES = [
    "Asia/Tokyo",
    "Europe/London",
    "UTC",
    "Europe/Paris",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Australia/Sydney",
    "Pacific/Auckland",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "Pacific/Honolulu",
    "America/Sao_Paulo",
    "America/Santiago",
];


// 未分類カテゴリーやボックスを識別するための一意なID
export const UNCLASSIFIED_ID = 'unclassified';