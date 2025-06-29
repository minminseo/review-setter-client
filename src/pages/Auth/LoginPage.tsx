import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// ログインフォームのバリデーションルールをzodで定義
const createLoginSchema = (t: (key: string) => string) => z.object({
    email: z.string().email(t('validation.invalidEmail')),
    password: z.string().min(1, t('validation.passwordRequired')), // ログイン時は空でないことだけをチェック
});

/**
 * ログインページコンポーネント
 * AuthLayout内で表示される
 */
const LoginPage = () => {
    // 多言語対応のためのフック
    const { t } = useTranslation();
    // 認証ロジック（ログインAPIの呼び出しなど）を取得
    const { login, isLoggingIn } = useAuth();
    // パスワード表示/非表示を切り替えるためのstate
    const [showPassword, setShowPassword] = React.useState(false);

    // 翻訳関数を使用してバリデーションスキーマを作成
    const loginSchema = createLoginSchema(t);

    // react-hook-formを初期化
    const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    // フォーム送信時の処理
    const onSubmit = (values: z.infer<typeof loginSchema>) => {
        // useAuthフックから取得したlogin関数を実行
        login(values);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-2xl">Review Setter</CardTitle>
                <CardDescription>{t('auth.login')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('auth.email')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder="name@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('auth.password')}</FormLabel>
                                    <div className="relative">
                                        <FormControl>
                                            <Input type={showPassword ? 'text' : 'password'} {...field} />
                                        </FormControl>
                                        {/* パスワードの表示/非表示を切り替えるボタン */}
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute inset-y-0 right-0 h-full px-3"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                        </Button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoggingIn}>
                            {isLoggingIn ? t('common.loading') : t('auth.login')}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter>
                <div className="text-center text-sm w-full">
                    {t('auth.noAccount')}?{' '}
                    <Link to="/signup" className="underline">
                        {t('auth.signup')}
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
};

export default LoginPage;