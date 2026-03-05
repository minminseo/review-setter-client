import React, { useEffect } from 'react';
import { useAuthTheme } from '@/store/authLanguageStore';

/**
 * 未ログイン時（認証画面）専用のテーマプロバイダー
 * Zustand状態に基づいてHTMLクラス名を動的に変更
 */
export const AuthThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useAuthTheme();

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    };

    applyTheme();

    // ThemeProvider(グローバルなテーマコンテキスト)の変更を監視して、強制的にAuthThemeを適用する
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (!root.classList.contains(theme)) {
            applyTheme();
          }
        }
      });
    });

    observer.observe(root, { attributes: true });

    return () => observer.disconnect();
  }, [theme]);

  return <>{children}</>;
};