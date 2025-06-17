import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

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
import { useAuth } from '@/hooks/useAuth';
import { LANGUAGES, THEME_COLORS, TIMEZONES } from '@/constants';
import { CreateUserInput } from '@/types';

const formSchema = z.object({
    email: z.string().email({ message: 'Invalid email address.' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
    timezone: z.string().min(1, { message: 'Please select a timezone.' }),
    theme_color: z.enum(['dark', 'light']),
    language: z.enum(['ja', 'en']),
});

const SignupPage = () => {
    const { t } = useTranslation();
    // const navigate = useNavigate();
    const { signup, isSigningUp } = useAuth();
    const [showPassword, setShowPassword] = React.useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: '',
            password: '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            theme_color: 'dark',
            language: 'ja',
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        const data: CreateUserInput = {
            ...values,
            password: values.password, // Ensure password is sent
        };
        signup(data, {
            onError: (error: any) => {
                const errorMessage = error.response?.data?.error || 'An unexpected error occurred.';
                toast.error(`Signup failed: ${errorMessage}`);
            }
        });
    };

    return (

        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-2xl">Review Setter</CardTitle>
                <CardDescription>{t('auth.signup')}</CardDescription>
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
                                    <FormLabel>{t('auth.timezone')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a timezone" />
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
                                    <FormLabel>{t('auth.themeColor')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a theme" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {THEME_COLORS.map(theme => (
                                                <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>
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
                                    <FormLabel>{t('auth.language')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a language" />
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
                            {isSigningUp ? t('common.loading') : t('auth.signup')}
                        </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter>
                <div className="text-center text-sm w-full">
                    {t('auth.haveAccount')}?{' '}
                    <Link to="/login" className="underline">
                        {t('auth.login')}
                    </Link>
                </div>
            </CardFooter>
        </Card>
    );
};

export default SignupPage;