import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateCategory, deleteCategory } from '@/api/categoryApi';
import { useCategoryStore } from '@/store';
import { GetCategoryOutput, UpdateCategoryInput } from '@/types';

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
const categorySchema = z.object({
    name: z.string().min(1, 'Category name is required.'),
});

// このモーダルが受け取るPropsの型定義
type EditCategoryModalProps = {
    isOpen: boolean;    // モーダルが開いているか
    onClose: () => void; // モーダルを閉じるための関数
    category: GetCategoryOutput; // 編集対象のカテゴリー情報
};

/**
 * 既存のカテゴリーを編集・削除するためのモーダルコンポーネント。
 */
export const EditCategoryModal = ({ isOpen, onClose, category }: EditCategoryModalProps) => {
    const queryClient = useQueryClient();
    const { updateCategory: updateInStore, removeCategory: removeFromStore } = useCategoryStore();

    // フォームの初期化。編集対象のカテゴリー名をデフォルト値として設定する
    const form = useForm<z.infer<typeof categorySchema>>({
        resolver: zodResolver(categorySchema),
        values: { name: category.name },
    });

    // カテゴリー更新APIを呼び出すためのmutation
    const updateMutation = useMutation({
        mutationFn: (data: UpdateCategoryInput) => updateCategory({ id: category.id, data }),
        onSuccess: (updatedCategory) => {
            // 成功した場合、キャッシュを無効化し、Zustandストアを更新する
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            updateInStore(updatedCategory);
            toast.success('Category updated successfully!');
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
            toast.success('Category deleted successfully!');
            onClose();
        },
        onError: (error) => toast.error(`Delete failed: ${error.message}`),
    });

    // 保存ボタンが押されたときの処理
    const onSubmit = (values: z.infer<typeof categorySchema>) => {
        updateMutation.mutate(values);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg h-[350px] max-h-[95vh] flex flex-col">
                <div className="h-full flex flex-col ">
                    <div className="flex-1 flex flex-col ">
                        <DialogHeader className=" text-ellipsis  whitespace-nowrap">
                            <DialogTitle className=" border-b pb-2">カテゴリー編集</DialogTitle>
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
                                                    <FormLabel className="inline-block pointer-events-none select-none">カテゴリー名</FormLabel>
                                                    <div className="w-full pb-10">
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
                                {/* フッターエリア：削除ボタンと保存・キャンセルボタンを左右に配置 */}
                                <DialogFooter className="justify-end">
                                    <div className="flex items-center gap-2 w-full justify-between">
                                        {/* 削除ボタン：誤操作を防ぐため、AlertDialogで確認を挟む */}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    className="absolute left-3 bottom-3"
                                                >削除</Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        この操作は取り消せません。カテゴリーに属する全てのボックスが削除され、復習物は未分類復習物ボックスへ移動されます。
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                                    {/* 削除実行ボタン */}
                                                    <AlertDialogAction onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                                                        {deleteMutation.isPending ? '削除中...' : '削除する'}
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                        <div className="flex gap-3 absolute right-3 bottom-3">
                                            <Button type="button" variant="outline" onClick={onClose}>
                                                キャンセル
                                            </Button>
                                            <Button type="submit" disabled={updateMutation.isPending}>
                                                {updateMutation.isPending ? '保存中...' : '保存'}
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