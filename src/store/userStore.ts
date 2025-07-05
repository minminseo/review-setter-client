import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GetUserOutput, ThemeColor, Language } from '@/types';
import { setLanguage } from '@/i18n';

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
    persist(
        (set) => ({
            isAuthenticated: false,
            user: null,
            theme: 'dark',
            language: 'ja',

            setUser: (user) => {
                setLanguage(user.language);
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
                setLanguage(language);
                set({ language });
            },
        }),
        {
            name: 'review-setter-user-storage',
            storage: createJSONStorage(() => localStorage),
            // `user`や`isAuthenticated`はリロード時にAPIで確認するため、永続化しない
            // UI設定（テーマ、言語）のみを永続化する
            partialize: (state) => ({ theme: state.theme, language: state.language }),
        }
    )
);