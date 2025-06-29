import { create } from 'zustand';

/**
 * 未ログイン時（認証画面）専用の言語・テーマ状態管理
 * ログイン前の3画面（サインアップ、ログイン、認証）でのみ使用
 * ログイン後は既存のi18nextとテーマProviderを使用するため、この状態は使用しない
 */

type AuthLanguage = 'ja' | 'en';
type AuthTheme = 'dark' | 'light';

interface AuthLanguageState {
    language: AuthLanguage;
    theme: AuthTheme;
    setLanguage: (language: AuthLanguage) => void;
    setTheme: (theme: AuthTheme) => void;
}

export const useAuthLanguageStore = create<AuthLanguageState>((set) => ({
    language: 'ja', // デフォルトは日本語
    theme: 'dark', // デフォルトはダークテーマ
    setLanguage: (language) => set({ language }),
    setTheme: (theme) => set({ theme }),
}));

/**
 * 認証画面用のテキスト定義
 */
export interface AuthTexts {
    // 共通
    serviceTitle: string;

    // ログイン画面
    login: string;
    loginDescription: string;
    email: string;
    password: string;
    noAccount: string;
    signup: string;
    loading: string;

    // サインアップ画面
    signupDescription: string;
    timezone: string;
    themeColor: string;
    language: string;
    haveAccount: string;
    selectTimezone: string;
    selectTheme: string;
    selectLanguage: string;

    // 認証画面
    verifyTitle: string;
    verifySubtitle: string;
    back: string;
    submit: string;

    // エラーメッセージ
    invalidEmail: string;
    passwordRequired: string;
    passwordRequirements: string;
    timezoneRequired: string;
    invalidAccess: string;

    // 成功メッセージ
    loginSuccess: string;
    signupSuccess: string;
    verificationSuccess: string;
    logoutInfo: string;

    // エラーメッセージ（認証系）
    loginFailed: string;
    signupFailed: string;
    verificationFailed: string;
    logoutFailed: string;
    loginErrorDescription: string;
    signupErrorDescription: string;
    verificationErrorDescription: string;
}

const japaneseTexts: AuthTexts = {
    // 共通
    serviceTitle: '復習効率を最適化するWebサービス',

    // ログイン画面
    login: 'ログイン',
    loginDescription: 'ログイン',
    email: 'メールアドレス',
    password: 'パスワード',
    noAccount: 'アカウントをお持ちでない方',
    signup: '新規登録',
    loading: '読み込み中...',

    // サインアップ画面
    signupDescription: '新規登録',
    timezone: 'タイムゾーン',
    themeColor: 'テーマ',
    language: '言語',
    haveAccount: 'すでにアカウントをお持ちの方',
    selectTimezone: 'タイムゾーンを選択してください',
    selectTheme: 'テーマを選択してください',
    selectLanguage: '言語を選択してください',

    // 認証画面
    verifyTitle: 'メール認証',
    verifySubtitle: 'メールで送信された認証コードを入力してください',
    back: '戻る',
    submit: '送信',

    // エラーメッセージ
    invalidEmail: '有効なメールアドレスを入力してください',
    passwordRequired: 'パスワードを入力してください',
    passwordRequirements: 'パスワードは6文字以上で入力してください',
    timezoneRequired: 'タイムゾーンを選択してください',
    invalidAccess: '不正なアクセスです。サインアップからやり直してください。',

    // 成功メッセージ
    loginSuccess: 'ログインしました。',
    signupSuccess: '認証コードを送信しました。メールをご確認ください。',
    verificationSuccess: 'メール認証が完了しました。',
    logoutInfo: 'ログアウトしました',

    // エラーメッセージ（認証系）
    loginFailed: 'ログインに失敗しました。',
    signupFailed: '新規登録に失敗しました。',
    verificationFailed: '認証に失敗しました。',
    logoutFailed: 'ログアウトに失敗しました',
    loginErrorDescription: 'メールアドレスとパスワードを確認してください。',
    signupErrorDescription: '入力内容を確認してください。',
    verificationErrorDescription: 'コードが正しくないか、期限切れです。',
};

const englishTexts: AuthTexts = {
    // 共通
    serviceTitle: 'Web Service to Optimize Review Efficiency',

    // ログイン画面
    login: 'Login',
    loginDescription: 'Login',
    email: 'Email',
    password: 'Password',
    noAccount: "Don't have an account",
    signup: 'Sign Up',
    loading: 'Loading...',

    // サインアップ画面
    signupDescription: 'Sign Up',
    timezone: 'Timezone',
    themeColor: 'Theme',
    language: 'Language',
    haveAccount: 'Already have an account',
    selectTimezone: 'Please select a timezone',
    selectTheme: 'Please select a theme',
    selectLanguage: 'Please select a language',

    // 認証画面
    verifyTitle: 'Email Verification',
    verifySubtitle: 'Enter the verification code sent to your email',
    back: 'Back',
    submit: 'Submit',

    // エラーメッセージ
    invalidEmail: 'Please enter a valid email address',
    passwordRequired: 'Please enter your password',
    passwordRequirements: 'Password must be at least 6 characters',
    timezoneRequired: 'Please select a timezone',
    invalidAccess: 'Invalid access. Please start over from the signup page.',

    // 成功メッセージ
    loginSuccess: 'Logged in successfully.',
    signupSuccess: 'Verification code sent. Please check your email.',
    verificationSuccess: 'Email verification completed.',
    logoutInfo: 'Logged out',

    // エラーメッセージ（認証系）
    loginFailed: 'Login failed.',
    signupFailed: 'Signup failed.',
    verificationFailed: 'Verification failed.',
    logoutFailed: 'Logout failed',
    loginErrorDescription: 'Please check your email and password.',
    signupErrorDescription: 'Please check your input.',
    verificationErrorDescription: 'The code is incorrect or has expired.',
};

/**
 * 現在の言語設定に基づいてテキストを取得するフック
 */
export const useAuthTexts = (): AuthTexts => {
    const language = useAuthLanguageStore((state) => state.language);
    return language === 'ja' ? japaneseTexts : englishTexts;
};

/**
 * 未ログイン時のテーマ状態を取得するフック
 */
export const useAuthTheme = (): AuthTheme => {
    return useAuthLanguageStore((state) => state.theme);
};