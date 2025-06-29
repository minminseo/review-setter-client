import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { createCategory } from '@/api/categoryApi';
import { useCategoryStore } from '@/store';
import { CreateCategoryInput } from '@/types';

// UI Components
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

// フォームのバリデーションルールをzodで定義
const categorySchema = z.object({
    // カテゴリー名は1文字以上必須
    name: z.string().min(1, 'Category name is required.'),
});

// このモーダルが受け取るPropsの型定義
type CreateCategoryModalProps = {
    isOpen: boolean;    // モーダルが開いているかどうか
    onClose: () => void; // モーダルを閉じるための関数
};

/**
 * 新しいカテゴリーを作成するためのモーダルコンポーネント。
 * ホーム画面やカテゴリー内部画面から呼び出されることを想定。
 */
export const CreateCategoryModal = ({ isOpen, onClose }: CreateCategoryModalProps) => {
    const { t } = useTranslation();
    // React Queryのキャッシュを操作するためのクライアント
    const queryClient = useQueryClient();
    // Zustandストアからカテゴリーを追加するアクションを取得
    const addCategoryToStore = useCategoryStore((state) => state.addCategory);

    // react-hook-formを使ってフォームの状態とバリデーションを管理
    const form = useForm<z.infer<typeof categorySchema>>({
        resolver: zodResolver(categorySchema),
        defaultValues: { name: '' },
    });

    // カテゴリー作成APIを呼び出すためのmutationを定義
    const mutation = useMutation({
        mutationFn: (data: CreateCategoryInput) => createCategory(data),
        // mutationが成功した後の処理
        onSuccess: (newCategory) => {
            // 1. サーバーから最新のカテゴリーリストを再取得するよう、キャッシュを無効化
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            // 2. Zustandストアにも新しいカテゴリーを追加し、UIに即時反映（楽観的更新）
            addCategoryToStore(newCategory);

            toast.success(t('notification.categoryCreated'));
            onClose(); // モーダルを閉じる
            form.reset(); // 次回開いた時のためにフォームをリセット
        },
        // mutationが失敗した後の処理
        onError: (error) => {
            toast.error(`Failed to create category: ${error.message}`);
        },
    });

    // フォームが送信されたときの処理
    const onSubmit = (values: z.infer<typeof categorySchema>) => {
        // mutationを実行してAPIを呼び出す
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
                                                    <div className="w-full pb-8">
                                                        <FormControl>
                                                            <Input placeholder={t('category.nameExample')} {...field} />
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
                                                {t('common.cancel')}
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