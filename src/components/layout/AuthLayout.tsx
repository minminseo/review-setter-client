import { Outlet } from 'react-router-dom';

/**
 * 認証ページ（ログイン、サインアップ）用の共通レイアウト
 *
 * @returns デザイン案に沿った2ペインのレイアウト。
 * 左側にサービス名、右側にフォームコンテンツ（Outlet）を表示する。
 */
const AuthLayout = () => {
    return (
        <div className="flex min-h-screen w-full">
            {/* --- 左ペイン：サービス名表示エリア --- */}
            {/* 画面が広い場合(lg以上)にのみ表示されるデザイン要素 */}
            <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-muted p-10">
                <h1 className="text-3xl font-bold text-foreground/80">
                    復習効率を最適化するWebサービス
                </h1>
            </div>

            {/* --- 右ペイン：フォームコンテンツエリア --- */}
            <div className="flex flex-1 items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* Outlet: ここにLoginPageやSignupPageなどのコンポーネントが描画される */}
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;