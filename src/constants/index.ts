import { ThemeColor, Language } from "@/types";

export const THEME_COLORS: { value: ThemeColor; label: string }[] = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
];

export const LANGUAGES: { value: Language; label: string }[] = [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
];

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