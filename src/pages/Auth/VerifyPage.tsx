import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// 認証関連のロジックを一元管理するカスタムフック
import { useAuth } from '@/hooks/useAuth';

// UI Components
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';

/**
 * サインアップ後に表示される、Eメール認証コードの入力ページ。
 */
const VerifyPage = () => {
    // 多言語対応のためのフック
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    // 認証ロジック（メール認証APIの呼び出しなど）を取得
    const { verifyEmail, isVerifying } = useAuth();

    // OTP（ワンタイムパスワード）の入力値を管理するstate
    const [otp, setOtp] = React.useState('');

    // サインアップページから渡されたメールアドレスを取得
    // location.stateは、navigate時に第二引数で渡されたstateオブジェクト
    const email = location.state?.email;

    // このページが直接URLで叩かれるなどして、email情報がない場合のガード処理
    React.useEffect(() => {
        if (!email) {
            toast.error('不正なアクセスです。サインアップからやり直してください。');
            navigate('/signup');
        }
    }, [email, navigate]);

    // 「送信」ボタンが押された、または6桁の入力が完了したときの処理
    const handleVerify = () => {
        // 入力が6桁でない場合は何もしない（ボタンがdisabledなので通常は起こらない）
        if (otp.length !== 6) {
            return;
        }
        // useAuthフック経由でメール認証APIを叩く
        verifyEmail({ email, code: otp });
    };

    // emailがない場合は、リダイレクトが走るまで何も表示しない
    if (!email) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('auth.verifyTitle')}</CardTitle>
                <CardDescription>
                    {/* i18nextの機能で、文字列内に変数を埋め込む */}
                    {t('auth.verifySubtitle', { email })}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-center">
                    <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(value) => setOtp(value)}
                        onComplete={handleVerify} // 6桁入力が完了したら自動で送信処理を呼ぶ
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => navigate('/signup')} disabled={isVerifying}>
                    {t('auth.back')}
                </Button>
                <Button onClick={handleVerify} disabled={isVerifying || otp.length < 6}>
                    {isVerifying ? t('common.loading') : t('auth.submit')}
                </Button>
            </CardFooter>
        </Card>
    );
};

export default VerifyPage;