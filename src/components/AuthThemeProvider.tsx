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
    
    // 既存のテーマクラスを削除
    root.classList.remove('light', 'dark');
    
    // 新しいテーマクラスを追加
    root.classList.add(theme);
    
    // クリーンアップ：コンポーネントがアンマウントされた時に元に戻す
    return () => {
      root.classList.remove('light', 'dark');
    };
  }, [theme]);

  return <>{children}</>;
};