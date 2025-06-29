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
    
    // クリーンアップ：コンポーネントがアンマウントされた時、ユーザーの実際のテーマを適用
    return () => {
      root.classList.remove('light', 'dark');
      
      // ユーザーのテーマ設定をlocalStorageから読み取り
      try {
        const zustandStorage = localStorage.getItem('review-setter-user-storage');
        if (zustandStorage) {
          const parsed = JSON.parse(zustandStorage);
          const userTheme = parsed.state?.theme;
          if (userTheme) {
            root.classList.add(userTheme);
          }
        }
      } catch (error) {
        // フォールバック：パースエラーの場合はdarkテーマを適用
        root.classList.add('dark');
      }
    };
  }, [theme]);

  return <>{children}</>;
};