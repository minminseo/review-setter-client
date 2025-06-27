import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/useAuth';
import { updateUser } from '@/api/authApi';
import { UpdateUserInput } from '@/types';
import { THEME_COLORS, LANGUAGES, TIMEZONES } from '@/constants';

// UI Components
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { SettingPasswordModl } from './SettingPasswordModl';

// ユーザー設定フォームのバリデーションルール
const settingsSchema = z.object({
    email: z.string().email("無効なメールアドレスです。"),
    theme_color: z.enum(['dark', 'light']),
    language: z.enum(['ja', 'en']),
    timezone: z.string().min(1, "タイムゾーンを選択してください。"),
});

type SettingsModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

/**
 * ユーザー設定（メール、テーマ、言語、タイムゾーン）を変更するためのモーダル。
 */
export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const queryClient = useQueryClient();
    const { user } = useAuth(); // 現在のユーザー情報をuseAuthフックから取得

    // フォームの状態管理
    const form = useForm<z.infer<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
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
            toast.success("設定を更新しました。");
            // ['user']クエリを無効化し、useAuthフックに最新のユーザー情報を再取得させる
            queryClient.invalidateQueries({ queryKey: ['user'] });
            onClose();
        },
        onError: (err) => toast.error(`更新に失敗しました: ${err.message}`),
    });

    // 保存ボタンが押されたときの処理
    const onSubmit = (values: z.infer<typeof settingsSchema>) => {
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
                            <DialogTitle>設定</DialogTitle>
                            <DialogDescription>ユーザー情報や表示設定を変更できます。</DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                                {/* FormFieldを正しく使用してフォームフィールドを実装 */}
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
                                                <FormLabel className="inline-block pointer-events-none select-none">テーマ</FormLabel>
                                                <div className="w-full">
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                        <SelectContent>{THEME_COLORS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="language" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">言語</FormLabel>
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
                                                <FormLabel className="inline-block pointer-events-none select-none">タイムゾーン</FormLabel>
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
                                            <h4 className="text-sm font-medium">パスワード</h4>
                                            <Button type="button" variant="outline" className="mt-2" onClick={() => setPasswordModalOpen(true)}>
                                                パスワードを変更
                                            </Button>
                                        </div>
                                    </div>
                                    <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                                </ScrollArea>
                                <DialogFooter className="justify-end">
                                    <div className="flex gap-3 absolute right-3 bottom-3">
                                        <Button type="button" variant="outline" onClick={onClose}>キャンセル</Button>
                                        <Button type="submit" disabled={updateMutation.isPending}>
                                            {updateMutation.isPending ? '保存中...' : '保存'}
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>
                </div>
                {/* パスワード変更モーダル */}
                <SettingPasswordModl isOpen={isPasswordModalOpen} onClose={() => setPasswordModalOpen(false)} />
            </DialogContent>
        </Dialog>
    );
};