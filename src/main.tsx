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
        <App />
      </BrowserRouter>
      {/* 開発時にReact Queryの状態を可視化するためのDevtools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
);