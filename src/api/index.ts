import axios from 'axios';

/**
 * アプリケーション全体で共有されるaxiosインスタンス。
 * APIとの通信はすべてこのインスタンスを経由して行われる。
 */
const api = axios.create({
    // 環境変数からAPIサーバーのURLを読み込む。
    // これにより、開発環境と本番環境で接続先を容易に切り替えられる。
    baseURL: import.meta.env.VITE_API_URL,
    // 異なるドメイン間でCookie（認証トークンなど）を自動で送受信するために必須の設定。
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * CSRFトークンを取得し、axiosのデフォルトヘッダーに設定する関数。
 * アプリ起動時に一度だけ呼び出される。
 * これにより、以降の全てのPOST, PUT, DELETEリクエストにCSRFトークンが自動で付与され、セキュリティが向上する。
 */
export const setupCsrfToken = async () => {
    const { data } = await api.get<{ csrf_token: string }>('/csrf');
    api.defaults.headers.common['X-CSRF-Token'] = data.csrf_token;
};

export default api;