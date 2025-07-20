import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// アプリケーション初期化用の関数とフック
import { setupCsrfToken } from './api';
import { useAuth } from './hooks/useAuth';
import { useUserStore } from './store/userStore';
import { setLanguage } from './i18n';

// レイアウト
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';
import { ThemeProvider } from "./components/theme-provider";

// 各ページ
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import VerifyPage from './pages/Auth/VerifyPage';
import HomePage from './pages/App/HomePage';
import BoxAndCategoryPage from './pages/App/BoxAndCategoryPage';
import TodaysReviewPage from './pages/App/TodaysReviewPage';
import PatternsPage from './pages/App/PatternsPage';
import NotFoundPage from './pages/NotFoundPage';
import LoadingPage from './pages/LoadingPage';

// UI
import { Toaster } from "@/components/ui/sonner";

// ユーザーの認証状態をAPI経由で確認し、未認証の場合はログインページにリダイレクト
const ProtectedRoute = () => {
  const { isAuthenticated, isUserLoading } = useAuth();

  if (isUserLoading) {
    return <AppLayout />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};


// 既に認証済みのユーザーが認証ページにアクセスした場合はホームページにリダイレクト。
// 未認証ユーザーまたはローディング中の場合は認証ページを表示。
const AuthGuard = () => {
  const { isAuthenticated, isUserLoading } = useAuth({ enabled: false });

  if (isUserLoading) {
    return <AuthLayout />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <AuthLayout />;
};

const App = () => {
  const [isCsrfReady, setIsCsrfReady] = useState(false);
  const language = useUserStore((state) => state.language);

  useEffect(() => {
    const initializeApp = async () => {
      await setupCsrfToken();
      setIsCsrfReady(true);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    setLanguage(language);
  }, [language]);

  if (!isCsrfReady) {
    return <LoadingPage />;
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        {/* 未認証ページ */}
        <Route element={<AuthGuard />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify" element={<VerifyPage />} />
        </Route>

        {/* 認証済みページ */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/patterns" element={<PatternsPage />} />
          <Route path="/categories/:categoryId" element={<BoxAndCategoryPage />} />
          <Route path="/categories/:categoryId/boxes/:boxId" element={<BoxAndCategoryPage />} />
          <Route path="/today" element={<TodaysReviewPage />} />
        </Route>

        {/* ルートが存在しない場合 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* トースター通知 */}
      <Toaster />
    </ThemeProvider>
  );
};

export default App;