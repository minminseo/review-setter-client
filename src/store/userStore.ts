import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GetUserOutput, ThemeColor, Language } from '@/types';
import { setLanguage } from '@/i18n';

// ユーザーの認証状態やUI設定をグローバルに管理するZustandストア
interface UserState {
    isAuthenticated: boolean;
    user: GetUserOutput | null;
    theme: ThemeColor;
    language: Language;
    // ユーザー情報をセットし、認証済み状態にする。テーマや言語もここから設定する。
    setUser: (user: GetUserOutput) => void;
    // ユーザー情報をクリアし、未認証状態にする
    clearUser: () => void;
    // 言語を変更し、i18nextにも反映する
    setLanguage: (language: Language) => void;
}

export const useUserStore = create<UserState>()(
    // `persist`ミドルウェアを使い、一部の状態をlocalStorageに永続化する
    persist(
        (set) => ({
            // 初期状態では未認証
            isAuthenticated: false,
            user: null,
            theme: 'dark', // デフォルトテーマ
            language: 'ja', // デフォルト言語

            setUser: (user) => {
                setLanguage(user.language); // i18nextに言語を設定
                set({
                    user,
                    isAuthenticated: true,
                    theme: user.theme_color,
                    language: user.language
                });
            },

            clearUser: () => set({
                user: null,
                isAuthenticated: false
            }),

            setLanguage: (language) => {
                setLanguage(language); // i18nextに言語を設定
                set({ language });
            },
        }),
        {
            name: 'review-setter-user-storage', // localStorageで使われるキー
            storage: createJSONStorage(() => localStorage),
            // `user`や`isAuthenticated`はリロード時にAPIで確認するため、永続化しない
            // UI設定（テーマ、言語）のみを永続化する
            partialize: (state) => ({ theme: state.theme, language: state.language }),
        }
    )
);