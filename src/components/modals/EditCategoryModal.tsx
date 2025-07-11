import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { updateCategory, deleteCategory } from '@/api/categoryApi';
import { useCategoryStore } from '@/store';
import { GetCategoryOutput, UpdateCategoryInput } from '@/types';

// UI
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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


// フォームのバリデーションルール
const createCategorySchema = (t: TFunction) => z.object({
    name: z.string().min(1, t('validation.categoryNameRequired')),
});

// このモーダルが受け取るPropsの型定義
type EditCategoryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    category: GetCategoryOutput; // 編集対象のカテゴリー情報
};

/**
 * 既存のカテゴリーを編集・削除するためのモーダルコンポーネント。
 */
export const EditCategoryModal = ({ isOpen, onClose, category }: EditCategoryModalProps) => {
    const queryClient = useQueryClient();
    const { updateCategory: updateInStore, removeCategory: removeFromStore } = useCategoryStore();
    const { t } = useTranslation();

    // フォームの初期化。編集対象のカテゴリー名をデフォルト値として設定する
    const form = useForm<z.infer<ReturnType<typeof createCategorySchema>>>({
        resolver: zodResolver(createCategorySchema(t)),
        values: { name: category.name },
    });

    // カテゴリー更新APIを呼び出すためのmutation
    const updateMutation = useMutation({
        mutationFn: (data: UpdateCategoryInput) => updateCategory({ id: category.id, data }),
        onSuccess: (updatedCategory) => {
            // 成功した場合、キャッシュを無効化し、Zustandストアを更新する
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            updateInStore(updatedCategory);
            toast.success(t('notification.categoryUpdated'));
            onClose();
        },
        onError: (error) => toast.error(`Update failed: ${error.message}`),
    });

    // カテゴリー削除APIを呼び出すためのmutation
    const deleteMutation = useMutation({
        mutationFn: () => deleteCategory(category.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            removeFromStore(category.id);
            toast.success(t('notification.categoryDeleted'));
            onClose();
        },
        onError: (error) => toast.error(`Delete failed: ${error.message}`),
    });

    // 保存ボタンが押されたときの処理
    const onSubmit = (values: z.infer<ReturnType<typeof createCategorySchema>>) => {
        updateMutation.mutate(values);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg h-[250px] max-h-[95vh] flex flex-col">
                <div className="h-full flex flex-col ">
                    <div className="flex-1 flex flex-col ">
                        <DialogHeader className=" text-ellipsis  whitespace-nowrap">
                            <DialogTitle className=" border-b pb-2">{t('category.edit')}</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)}
                                className="flex flex-col h-full"
                                style={{ minWidth: 0 }}>
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
                                                            <Input {...field} className=" text-ellipsis overflow-hidden whitespace-nowrap" />
                                                        </FormControl>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                                </ScrollArea>
                                <DialogFooter className="justify-end">
                                    <div className="flex items-center gap-2 w-full justify-between">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    className="absolute left-3 bottom-3"
                                                >{t('common.delete')}</Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>{t('category.delete')}</AlertDialogTitle>
                                                    <AlertDialogDescription>{t('category.deleteDescription')}</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteMutation.mutate()}
                                                        disabled={deleteMutation.isPending}
                                                        className="bg-destructive text-white hover:bg-destructive/90"
                                                    >
                                                        {deleteMutation.isPending ? t('loading.deleting') : t('common.delete')}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                        <div className="flex gap-3 absolute right-3 bottom-3">
                                            <Button type="button" variant="outline" onClick={onClose}>
                                                {t('common.close')}
                                            </Button>
                                            <Button type="submit" disabled={updateMutation.isPending}>
                                                {updateMutation.isPending ? t('loading.saving') : t('common.save')}
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