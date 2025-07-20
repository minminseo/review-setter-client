import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/store';
import { useAuthLanguageStore } from '@/store/authLanguageStore';

const LoadingPage = () => {
  const { t } = useTranslation();

  // 認証済みユーザーのテーマ取得
  const userTheme = useUserStore((state) => state.theme);

  // 未認証時の一時的なテーマ設定取得
  const authTheme = useAuthLanguageStore((state) => state.theme);

  const currentTheme = userTheme || authTheme || 'dark';

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(currentTheme);
  }, [currentTheme]);

  return (
    <div className="bg-background text-foreground min-h-screen w-screen flex items-center justify-center fixed top-0 left-0 z-[9999]">
      <div className="text-center">
        {t('loading.initializing')}
      </div>
    </div>
  );
};

export default LoadingPage;