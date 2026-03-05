import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export const useAuthLanguageStore = create<AuthLanguageState>()(
    persist(
        (set) => ({
            language: 'ja',
            theme: 'dark',
            setLanguage: (language) => set({ language }),
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'auth-language-storage', // localStorageのキー名
        }
    )
);

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

    // パスワードリセット
    forgotPassword: string;
    resetPassword: string;
    sendResetCode: string;
    resetPasswordDescription: string;
    verifyCodeDescription: string;
    verifyCode: string;
    newPassword: string;

    // 認証画面
    verifyTitle: string;
    verifySubtitle: string;
    back: string;
    submit: string;

    // エラーメッセージ
    invalidCode: string;
    invalidEmail: string;
    passwordRequired: string;
    passwordRequirements: string;
    passwordMinLength: string;
    timezoneRequired: string;
    invalidAccess: string;
    passwordResetFailed: string;
    sendResetCodeError: string;

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
    serviceTitle: '楽に復習スケジュールを管理できるWebサービス',

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

    // パスワードリセット
    forgotPassword: 'パスワードをお忘れですか？',
    resetPassword: 'パスワードをリセット',
    sendResetCode: '認証コードを送信',
    resetPasswordDescription: '登録したメールアドレスを入力してください。',
    verifyCodeDescription: 'メールで送信された認証コードと新しいパスワードを入力してください。',
    verifyCode: '認証コード',
    newPassword: '新しいパスワード',

    // 認証画面
    verifyTitle: 'メール認証',
    verifySubtitle: 'メールで送信された認証コードを入力してください',
    back: '戻る',
    submit: '送信',

    // エラーメッセージ
    invalidCode: '無効な認証コードです',
    invalidEmail: '有効なメールアドレスを入力してください',
    passwordRequired: 'パスワードを入力してください',
    passwordRequirements: 'パスワードは6文字以上で入力してください',
    passwordMinLength: 'パスワードは6文字以上で入力してください',
    timezoneRequired: 'タイムゾーンを選択してください',
    invalidAccess: '不正なアクセスです。サインアップからやり直してください。',
    passwordResetFailed: 'パスワードリセットに失敗しました',
    sendResetCodeError: '認証コードの送信に失敗しました',

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
    signupErrorDescription: 'このメールアドレスはすでに使用されています。',
    verificationErrorDescription: 'コードが正しくないか、期限切れです。',
};

const englishTexts: AuthTexts = {
    // 共通
    serviceTitle: 'Web service for easily managing your review schedule',

    // ログイン画面
    login: 'Login',
    loginDescription: 'Login',
    email: 'Email',
    password: 'Password',
    noAccount: "New users",
    signup: 'Sign Up',
    loading: 'Loading...',

    // サインアップ画面
    signupDescription: 'Sign Up',
    timezone: 'Timezone',
    themeColor: 'Theme',
    language: 'Language',
    haveAccount: 'Existing users',
    selectTimezone: 'Please select a timezone',
    selectTheme: 'Please select a theme',
    selectLanguage: 'Please select a language',

    // パスワードリセット
    forgotPassword: 'Forgot your password?',
    resetPassword: 'Reset Password',
    sendResetCode: 'Send Authentication Code',
    resetPasswordDescription: 'Please enter your registered email address.',
    verifyCodeDescription: 'Please enter the authentication code sent to your email and your new password.',
    verifyCode: 'Verification Code',
    newPassword: 'New Password',

    // 認証画面
    verifyTitle: 'Email Verification',
    verifySubtitle: 'Enter the verification code sent to your email',
    back: 'Back',
    submit: 'Submit',

    // エラーメッセージ
    invalidCode: 'Invalid authentication code.',
    invalidEmail: 'Please enter a valid email address',
    passwordRequired: 'Please enter your password',
    passwordRequirements: 'Password must be at least 6 characters',
    passwordMinLength: 'Password must be at least 6 characters',
    timezoneRequired: 'Please select a timezone',
    invalidAccess: 'Invalid access. Please start over from the signup page.',
    passwordResetFailed: 'Password reset failed',
    sendResetCodeError: 'Failed to send authentication code',

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
    signupErrorDescription: 'This email address is already in use.',
    verificationErrorDescription: 'The code is incorrect or has expired.',
};

// 現在の言語設定に基づいてテキストを取得するフック
export const useAuthTexts = (): AuthTexts => {
    const language = useAuthLanguageStore((state) => state.language);
    return language === 'ja' ? japaneseTexts : englishTexts;
};

// 未ログイン時のテーマ状態を取得するフック
export const useAuthTheme = (): AuthTheme => {
    return useAuthLanguageStore((state) => state.theme);
};