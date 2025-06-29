import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { updatePassword } from '@/api/authApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

const passwordSchema = (t: TFunction) => z.object({
    newPassword: z.string().min(6, t('validation.passwordMinLength')),
    confirm: z.string().min(6, t('validation.confirmPasswordMinLength')),
}).refine((data) => data.newPassword === data.confirm, {
    message: t('validation.passwordsDoNotMatch'),
    path: ['confirm'],
});

type SettingPasswordModlProps = {
    isOpen: boolean;
    onClose: () => void;
};

export const SettingPasswordModl = ({ isOpen, onClose }: SettingPasswordModlProps) => {
    const { t } = useTranslation();
    const schema = passwordSchema(t);
    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { newPassword: '', confirm: '' },
        mode: 'onSubmit', // バリデーションはsubmit時のみ
        reValidateMode: 'onSubmit',
    });

    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);
    const [submitError, setSubmitError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!isOpen) {
            form.reset();
            setSubmitError(null);
        }
    }, [isOpen, form]);

    const mutation = useMutation({
        mutationFn: async (data: { newPassword: string }) => {
            await updatePassword({ password: data.newPassword });
        },
        onSuccess: () => {
            toast.success(t('notification.passwordUpdated'));
            onClose();
        },
        onError: (err: any) => {
            toast.error(t('error.updateFailed', { message: err.message }));
        },
    });

    const onSubmit = async (values: z.infer<typeof schema>) => {
        setSubmitError(null);
        const valid = await form.trigger();
        if (!valid) {
            setSubmitError(t('validation.passwordRequirements'));
            return;
        }
        mutation.mutate({ newPassword: values.newPassword });
    };

    const newPassword = form.watch('newPassword');
    const confirm = form.watch('confirm');
    // ボタンの無効化条件は「両方に入力があるかどうか」だけ
    const isDisabled = !newPassword || !confirm || mutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg h-[350px] max-h-[95vh] flex flex-col">
                <div className="h-full flex flex-col ">
                    <div className="flex-1 flex flex-col ">
                        <DialogHeader>
                            <DialogTitle>{t('settings.changePassword')}</DialogTitle>
                            <DialogDescription>{t('settings.enterNewPassword')}</DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                                <ScrollArea className="flex-1 min-h-0 max-h-[calc(100vh-200px)]">
                                    <div className="space-y-4 py-4">
                                        <FormField name="newPassword" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('settings.newPassword')}</FormLabel>
                                                <div className="w-full relative flex items-center">
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            type={showPassword ? 'text' : 'password'}
                                                            autoComplete="new-password"
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                form.clearErrors('newPassword');
                                                                form.clearErrors('confirm');
                                                                setSubmitError(null);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <Button type="button" variant="ghost" size="icon" className="absolute right-2" tabIndex={-1} onClick={() => setShowPassword(v => !v)}>
                                                        {showPassword ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.249-2.6A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.043 5.197M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                                                        )}
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="confirm" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('settings.confirmPassword')}</FormLabel>
                                                <div className="w-full relative flex items-center">
                                                    <FormControl>
                                                        <Input
                                                            {...field}
                                                            type={showConfirm ? 'text' : 'password'}
                                                            autoComplete="new-password"
                                                            onChange={(e) => {
                                                                field.onChange(e);
                                                                form.clearErrors('newPassword');
                                                                form.clearErrors('confirm');
                                                                setSubmitError(null);
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <Button type="button" variant="ghost" size="icon" className="absolute right-2" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}>
                                                        {showConfirm ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95m3.249-2.6A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.956 9.956 0 01-4.043 5.197M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" /></svg>
                                                        )}
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                </ScrollArea>
                                <DialogFooter className="justify-end">
                                    <div className="flex gap-3 absolute right-3 bottom-3">
                                        <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
                                        <Button type="submit" disabled={isDisabled}>
                                            {mutation.isPending ? t('loading.updating') : t('common.edit')}
                                        </Button>
                                    </div>
                                </DialogFooter>
                            </form>
                        </Form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
