import { Outlet } from 'react-router-dom';
import { useAuthTexts } from '@/store/authLanguageStore';

const AuthLayout = () => {
    // 未ログイン時専用の言語状態管理からテキストを取得
    const texts = useAuthTexts();

    return (
        <div className="flex min-h-screen w-full">
            <div className="hidden lg:flex lg:flex-1 items-center justify-center bg-muted p-10">
                <h1 className="text-3xl font-bold text-foreground/80">
                    {texts.serviceTitle}
                </h1>
            </div>

            <div className="flex flex-1 items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* ここにLoginPageやSignupPageなどのコンポーネントが描画される */}
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;