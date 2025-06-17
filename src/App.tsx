import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// アプリケーションの初期化に必要な関数とフック
import { setupCsrfToken } from './api';
import { useAuth } from './hooks/useAuth';

// レイアウトコンポーネント
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';
import { ThemeProvider } from "./components/theme-provider";

// 各ページコンポーネント
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';
import VerifyPage from './pages/Auth/VerifyPage';
import HomePage from './pages/App/HomePage';
import CategoryPage from './pages/App/CategoryPage';
import BoxPage from './pages/App/BoxPage';
import TodaysReviewPage from './pages/App/TodaysReviewPage';
import PatternsPage from './pages/App/PatternsPage';

// UIコンポーネント
import { Toaster } from "@/components/ui/sonner";

/**
 * 認証が必要なルートを保護するためのコンポーネント。
 * ユーザーの認証状態をAPI経由で確認し、未認証の場合はログインページにリダイレクトする。
 */
const ProtectedRoute = () => {
  // useAuthフックが内部で/userエンドポイントを叩き、認証状態を管理する
  const { isAuthenticated, isUserLoading } = useAuth();

  // ローディング中は現在のページを表示（リダイレクトしない）
  if (isUserLoading) {
    return <AppLayout />;
  }

  // 未認証の場合のみログインページにリダイレクト
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 認証済みの場合はメインアプリのレイアウトを表示
  return <AppLayout />;
};

/**
 * 認証済みユーザーが認証ページ（ログイン、サインアップ等）にアクセスした場合にホームページにリダイレクトするためのコンポーネント。
 */
const AuthGuard = () => {
  const { isAuthenticated, isUserLoading } = useAuth();

  // ローディング中は認証レイアウトを表示（ローディング画面は表示しない）
  if (isUserLoading) {
    return <AuthLayout />;
  }

  // 認証済みの場合はホームページへリダイレクト
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // 未認証の場合は認証レイアウトを表示
  return <AuthLayout />;
};

/**
 * アプリケーションのルートコンポーネント。
 * 全体のルーティング、テーマ管理、CSRFトークンの初期化など、アプリケーションの土台となる設定を行う。
 */
const App = () => {
  // CSRFトークンの準備が完了したかどうかを管理するstate
  const [isCsrfReady, setIsCsrfReady] = useState(false);

  // アプリケーション起動時に一度だけ実行される副作用フック
  useEffect(() => {
    const initializeApp = async () => {
      // API通信の準備として、まずCSRFトークンを取得・設定する
      await setupCsrfToken();
      // 準備が完了したことをstateに記録する
      setIsCsrfReady(true);
    };
    initializeApp();
  }, []); // 空の依存配列で、初回レンダリング時にのみ実行されることを保証

  // CSRFトークンの準備ができるまでは、画面に何も表示しない（またはローディング画面を表示）
  // これにより、トークンが未設定の状態でAPIリクエストが送られることを防ぐ
  if (!isCsrfReady) {
    return <div>Initializing Application...</div>;
  }

  return (
    // アプリケーション全体をThemeProviderで囲み、ダークモード/ライトモードを有効にする
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      {/* react-router-domによるルーティング設定 */}
      <Routes>
        {/* 認証ページのルート設定（認証済みユーザーはホームページにリダイレクト） */}
        <Route element={<AuthGuard />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify" element={<VerifyPage />} />
        </Route>

        {/* 認証が必要なページのルート設定（ProtectedRouteで囲む） */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/patterns" element={<PatternsPage />} />
          <Route path="/categories/:categoryId" element={<CategoryPage />} />
          <Route path="/categories/:categoryId/boxes/:boxId" element={<BoxPage />} />
          <Route path="/today" element={<TodaysReviewPage />} />
        </Route>

        {/* 上記のどのルートにも一致しない場合はログインページにリダイレクト */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* sonnerによる通知（トースト）を表示するためのグローバルコンポーネント */}
      <Toaster />
    </ThemeProvider>
  );
};

export default App;