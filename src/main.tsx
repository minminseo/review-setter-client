import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import App from './App.tsx';
import './i18n';
import './style.css';

// React Queryのクライアントインスタンスを作成
// アプリケーション全体でサーバーの状態を管理する
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // APIリクエストが失敗した際に、自動で再試行しないように設定
      retry: false,
      // ユーザーがブラウザのウィンドウを再度フォーカスした際に、自動でデータを再取得しないように設定
      refetchOnWindowFocus: false,
      // ページ再マウント時の自動再取得を有効にする
      refetchOnMount: true,
      // ネットワーク再接続時の自動再取得を無効化
      refetchOnReconnect: false,
      // データを古いとみなすまでの時間を設定
      staleTime: 1000 * 60 * 5, // 5分
      // キャッシュ時間を設定
      gcTime: 1000 * 60 * 30, // 30分
    },
  },
});

// ReactアプリケーションをDOMにレンダリングする
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* QueryClientProviderでアプリをラップし、React Queryを使えるようにする */}
    <QueryClientProvider client={queryClient}>
      {/* BrowserRouterでアプリをラップし、ルーティング（画面遷移）を有効にする */}
      <BrowserRouter>
        <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
          <App />
        </React.Suspense>
      </BrowserRouter>
      {/* 開発時にReact Queryの状態を可視化するためのDevtools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);
