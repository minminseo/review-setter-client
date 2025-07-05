import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/hooks/useAuth';
import { updateUser } from '@/api/authApi';
import { UpdateUserInput } from '@/types';
import { THEME_COLORS, LANGUAGES, TIMEZONES } from '@/constants';
import { useTheme } from '@/components/theme-provider';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { SettingPasswordModl } from './SettingPasswordModl';
import { TFunction } from 'i18next';

// ユーザー設定フォームのバリデーションルール
const settingsSchema = (t: TFunction) => z.object({
    email: z.string().email(t('validation.invalidEmail')),
    theme_color: z.enum(['dark', 'light']),
    language: z.enum(['ja', 'en']),
    timezone: z.string().min(1, t('auth.selectTimezone')),
});

type SettingsModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

// ユーザー設モーダル
export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { t } = useTranslation();
    const { setTheme } = useTheme();

    const schema = settingsSchema(t);

    // フォームの状態管理
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
    });

    // モーダルが開かれたとき、またはユーザー情報が更新されたときに、
    // フォームの値を現在のユーザー情報でリセット（初期値を設定）する
    React.useEffect(() => {
        if (user && isOpen) {
            form.reset({
                email: user.email,
                theme_color: user.theme_color,
                language: user.language,
                timezone: user.timezone,
            });
        }
    }, [user, isOpen, form]);

    // ユーザー情報更新のmutation
    const updateMutation = useMutation({
        mutationFn: (data: UpdateUserInput) => updateUser(data),
        onSuccess: () => {
            toast.success(t('notification.userUpdated'));
            // ['user']クエリを無効化し、useAuthフックに最新のユーザー情報を再取得させる
            queryClient.invalidateQueries({ queryKey: ['user'] });
            onClose();
        },
        onError: (err) => toast.error(t('error.updateFailed', { message: err.message })),
    });

    // 保存ボタンが押されたときの処理
    const onSubmit = (values: z.infer<typeof schema>) => {
        // テーマを即座に反映
        setTheme(values.theme_color);
        updateMutation.mutate(values);
    };

    // パスワード変更モーダルの開閉状態
    const [isPasswordModalOpen, setPasswordModalOpen] = React.useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg h-[550px] max-h-[95vh] flex flex-col">
                <div className="h-full flex flex-col ">
                    <div className="flex-1 flex flex-col ">
                        <DialogHeader>
                            <DialogTitle>{t('sidebar.settings')}</DialogTitle>
                            <DialogDescription>{t('settings.description')}</DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                                <ScrollArea className="flex-1 min-h-0 max-h-[calc(100vh-200px)]">
                                    <div className="space-y-4 py-4">
                                        <FormField name="email" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">Email</FormLabel>
                                                <div className="w-full">
                                                    <FormControl><Input {...field} readOnly /></FormControl>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="theme_color" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('settings.theme')}</FormLabel>
                                                <div className="w-full">
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>{THEME_COLORS.map(tcol => <SelectItem key={tcol.value} value={tcol.value}>{tcol.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="language" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('settings.language')}</FormLabel>
                                                <div className="w-full">
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>{LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="timezone" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('settings.timezone')}</FormLabel>
                                                <div className="w-full">
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>{TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <Separator />
                                        <div>
                                            <h4 className="text-sm font-medium">{t('settings.password')}</h4>
                                            <Button type="button" variant="outline" className="mt-2" onClick={() => setPasswordModalOpen(true)}>
                                                {t('settings.changePassword')}
                                            </Button>
                                        </div>
                                    </div>
                                    <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                                </ScrollArea>
                                <DialogFooter className="justify-end">
                                    <div className="flex gap-3 absolute right-3 bottom-3">
                                        <Button type="button" variant="outline" onClick={onClose}>{t('common.close')}</Button>
                                        <Button type="submit" disabled={updateMutation.isPending}>
                                            {updateMutation.isPending ? t('loading.saving') : t('common.save')}
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>
                </div>
                <SettingPasswordModl isOpen={isPasswordModalOpen} onClose={() => setPasswordModalOpen(false)} />
            </DialogContent>
        </Dialog>
    );
};