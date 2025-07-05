import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { createCategory } from '@/api/categoryApi';
import { useCategoryStore } from '@/store';
import { CreateCategoryInput } from '@/types';

// UI
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

const createCategorySchema = (t: TFunction) => z.object({
    name: z.string().min(1, t('validation.categoryNameRequired')),
});

type CreateCategoryModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

/**
 * 新しいカテゴリーを作成するためのモーダルコンポーネント。
 */
export const CreateCategoryModal = ({ isOpen, onClose }: CreateCategoryModalProps) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const addCategoryToStore = useCategoryStore((state) => state.addCategory);

    const form = useForm<z.infer<ReturnType<typeof createCategorySchema>>>({
        resolver: zodResolver(createCategorySchema(t)),
        defaultValues: { name: '' },
    });

    // カテゴリー作成APIを呼び出すためのmutationを定義
    const mutation = useMutation({
        mutationFn: (data: CreateCategoryInput) => createCategory(data),
        onSuccess: (newCategory) => {
            // サーバーから最新のカテゴリーリストを再取得するよう、キャッシュを無効化
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            // Zustandストアにも新しいカテゴリーを追加し、UIに即時反映（楽観的更新）
            addCategoryToStore(newCategory);

            toast.success(t('notification.categoryCreated'));
            onClose();
            form.reset(); // 次回開いた時のためにフォームをリセット
        },
        onError: (error) => {
            toast.error(`Failed to create category: ${error.message}`);
        },
    });

    const onSubmit = (values: z.infer<ReturnType<typeof createCategorySchema>>) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg h-[250px] max-h-[95vh] flex flex-col">
                <div className="h-full flex flex-col ">
                    <div className="flex-1 flex flex-col ">
                        <DialogHeader>
                            <DialogTitle>{t('category.create')}</DialogTitle>
                            <DialogDescription>
                                {t('category.createDescription')}
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                                <ScrollArea className="flex-1 min-h-0 max-h-[calc(100vh-200px)]">
                                    <div className="space-y-4 py-4">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="inline-block pointer-events-none select-none">{t('category.name')}</FormLabel>
                                                    <div className="w-full">
                                                        <FormControl>
                                                            <Input {...field} />
                                                        </FormControl>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                                </ScrollArea>
                                <DialogFooter>
                                    <div className="flex gap-2 w-full justify-end">
                                        <div className="flex gap-2 absolute right-3 bottom-3">
                                            <Button type="button" variant="outline" onClick={onClose}>
                                                {t('common.close')}
                                            </Button>
                                            <Button type="submit" disabled={mutation.isPending}>
                                                {mutation.isPending ? t('loading.creating') : t('common.create')}
                                            </Button>
                                        </div>
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