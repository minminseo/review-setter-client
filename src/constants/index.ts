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
    "UTC",
    "Asia/Tokyo",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London"
];

// 未分類カテゴリーやボックスを識別するための一意なID
export const UNCLASSIFIED_ID = 'unclassified';