import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthTexts, useAuthLanguageStore } from '@/store/authLanguageStore';
import { useAuth } from '@/hooks/useAuth';
import { AuthThemeProvider } from '@/components/AuthThemeProvider';

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { LANGUAGES, THEME_COLORS, TIMEZONES } from '@/constants';

const createFormSchema = (texts: { invalidEmail: string; passwordRequirements: string; timezoneRequired: string }) => z.object({
    email: z.string().email({ message: texts.invalidEmail }),
    password: z.string().min(6, { message: texts.passwordRequirements }),
    timezone: z.string().min(1, { message: texts.timezoneRequired }),
    theme_color: z.enum(['dark', 'light']),
    language: z.enum(['ja', 'en']),
});

const SignupPage = () => {
    // 未ログイン時専用の言語・テーマ状態管理を使用
    const texts = useAuthTexts();
    const { language, theme, setLanguage, setTheme } = useAuthLanguageStore();
    const { signup, isSigningUp } = useAuth({ enabled: false });
    const [showPassword, setShowPassword] = React.useState(false);

    const formSchema = createFormSchema(texts);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            theme_color: theme,
            language: language,
        },
    });

    // 言語状態が変更されたらフォームの値も更新
    React.useEffect(() => {
        form.setValue('language', language);
    }, [language, form]);

    // テーマ状態が変更されたらフォームの値も更新
    React.useEffect(() => {
        form.setValue('theme_color', theme);
    }, [theme, form]);

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        signup(values);
    };

    return (
        <AuthThemeProvider>
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="text-2xl">Review Setter</CardTitle>
                    <CardDescription>{texts.signupDescription}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
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
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{texts.password}</FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input type={showPassword ? 'text' : 'password'} {...field} />
                                            </FormControl>
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
                            <FormField
                                control={form.control}
                                name="timezone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{texts.timezone}</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={texts.selectTimezone} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {TIMEZONES.map(tz => (
                                                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="theme_color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{texts.themeColor}</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                // テーマ選択時に未ログイン時専用の状態を更新
                                                setTheme(value as 'dark' | 'light');
                                            }}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={texts.selectTheme} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {THEME_COLORS.map(themeOption => (
                                                    <SelectItem key={themeOption.value} value={themeOption.value}>{themeOption.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="language"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{texts.language}</FormLabel>
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                // 言語選択時に未ログイン時専用の状態を更新
                                                setLanguage(value as 'ja' | 'en');
                                            }}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder={texts.selectLanguage} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {LANGUAGES.map(lang => (
                                                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={isSigningUp}>
                                {isSigningUp ? texts.loading : texts.signup}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                <CardFooter>
                    <div className="text-center text-sm w-full">
                        {texts.haveAccount}?{' '}
                        <Link to="/login" className="underline">
                            {texts.login}
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </AuthThemeProvider>
    );
};

export default SignupPage;