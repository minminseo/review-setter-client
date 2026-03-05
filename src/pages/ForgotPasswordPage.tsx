import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useAuthTexts } from '@/store/authLanguageStore';
import { useAuth } from '@/hooks/useAuth';

import { AuthThemeProvider } from '@/components/AuthThemeProvider';
import { requestPasswordReset } from '@/api/authApi';

// UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

// メールアドレス入力ステップのバリデーションスキーマ
const createEmailSchema = (texts: { invalidEmail: string }) => z.object({
    email: z.string().email(texts.invalidEmail),
});

// パスワードリセットステップのバリデーションスキーマ
const createResetSchema = (texts: { invalidCode: string, invalidEmail: string, passwordMinLength: string, passwordsDoNotMatch: string }) => z.object({
    email: z.string().email({ message: texts.invalidEmail }),
    code: z.string().length(6, { message: texts.invalidCode }),
    password: z.string().min(6, { message: texts.passwordMinLength }),
    confirm: z.string().min(6, { message: texts.passwordMinLength }),
}).refine((data) => data.password === data.confirm, {
    message: texts.passwordsDoNotMatch,
    path: ['confirm'],
});

const ForgotPasswordPage = () => {
    // 未ログイン時専用の言語状態管理を使用
    const texts = useAuthTexts();
    const { resetPassword, isResetingPassword } = useAuth({ enabled: false });
    // ステップ管理（メールアドレス入力 or パスワードリセット）
    const [step, setStep] = React.useState<'email' | 'reset'>('email');
    // 通信中の状態
    const [isLoading, setIsLoading] = React.useState(false);
    // パスワード表示/非表示の状態
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);

    // ステップ1: メールアドレス入力
    const emailSchema = createEmailSchema(texts);
    const emailForm = useForm<z.infer<typeof emailSchema>>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: '' },
    });

    // ステップ2: パスワードリセット
    const resetSchema = createResetSchema(texts);
    const resetForm = useForm<z.infer<typeof resetSchema>>({
        resolver: zodResolver(resetSchema),
        defaultValues: {
            email: '',
            code: '',
            password: '',
            confirm: '',
        },
    });

    // ステップ1: 認証番号リクエスト
    const onRequestEmail = async (values: z.infer<typeof emailSchema>) => {
        setIsLoading(true);
        try {
            await requestPasswordReset({ email: values.email });
            resetForm.reset({
                email: values.email,
                code: '',
                password: '',
            }); // フォーム状態をリセットしつつemailを設定
            setStep('reset');
            toast.success(texts.sendResetCode);
        } catch {
            toast.error(texts.sendResetCodeError);
        } finally {
            setIsLoading(false);
        }
    };

    // ステップ2: コードと新パスワードによるリセット実行
    const onResetPassword = (values: z.infer<typeof resetSchema>) => {
        resetPassword(values);
    };

    // 監視：パスワードと認証番号の入力状態
    const password = resetForm.watch('password');
    const confirm = resetForm.watch('confirm');
    const code = resetForm.watch('code');
    const isResetButtonDisabled = !password || !confirm || (code?.length ?? 0) < 6 || isLoading;

    return (
        <AuthThemeProvider>
            <div className="container flex h-screen h-dvh w-screen flex-col justify-center">
                <Card className="w-full max-w-[530px] h-full max-h-[400px] aspect-[9/4] flex flex-col">
                    <CardHeader>
                        <CardTitle className="text-2xl">Review Setter</CardTitle>
                        <CardDescription>
                            {step === 'email' ? texts.resetPasswordDescription : texts.verifyCodeDescription}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* ステップ1: メールアドレス入力 */}
                        {step === 'email' ? (
                            <Form {...emailForm}>
                                <form onSubmit={emailForm.handleSubmit(onRequestEmail)} className="space-y-4">
                                    <FormField
                                        control={emailForm.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{texts.email}</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="name@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? texts.loading : texts.sendResetCode}
                                    </Button>
                                </form>
                            </Form>
                        ) : (
                            /* ステップ2: 認証番号とパスワード入力 */
                            <Form {...resetForm}>
                                <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                                    <input type="email" autoComplete="username" defaultValue={resetForm.getValues('email')} className="hidden" />
                                    <FormField
                                        control={resetForm.control}
                                        name="code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{texts.verifyCode}</FormLabel>
                                                <FormControl>
                                                    <div className="flex justify-center">
                                                        <InputOTP maxLength={6} {...field} autoComplete="one-time-code">
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
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={resetForm.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{texts.newPassword}</FormLabel>
                                                <div className="relative">
                                                    <FormControl>
                                                        <Input
                                                            type={showPassword ? 'text' : 'password'}
                                                            autoComplete="new-password"
                                                            {...field}
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                resetForm.clearErrors('password');
                                                                resetForm.clearErrors('confirm');
                                                            }}
                                                        />
                                                    </FormControl>
                                                    {/* パスワード表示/非表示ボタン */}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        tabIndex={-1}
                                                        className="absolute inset-y-0 right-0 h-full px-3"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                    >
                                                        {showPassword ? (
                                                            <EyeSlashIcon className="h-5 w-5" />
                                                        ) : (
                                                            <EyeIcon className="h-5 w-5" />
                                                        )}
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={resetForm.control}
                                        name="confirm"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{texts.confirmPassword}</FormLabel>
                                                <div className="relative">
                                                    <FormControl>
                                                        <Input
                                                            type={showConfirm ? 'text' : 'password'}
                                                            autoComplete="new-password"
                                                            {...field}
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                resetForm.clearErrors('password');
                                                                resetForm.clearErrors('confirm');
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        tabIndex={-1}
                                                        className="absolute inset-y-0 right-0 h-full px-3"
                                                        onClick={() => setShowConfirm(!showConfirm)}
                                                    >
                                                        {showConfirm ? (
                                                            <EyeSlashIcon className="h-5 w-5" />
                                                        ) : (
                                                            <EyeIcon className="h-5 w-5" />
                                                        )}
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isResetingPassword || isResetButtonDisabled}>
                                        {isResetingPassword ? texts.loading : texts.resetPassword}
                                    </Button>
                                </form>
                            </Form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AuthThemeProvider>
    );
};

export default ForgotPasswordPage;