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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>カテゴリー編集: {category.name}</DialogTitle>
                    <DialogDescription>
                        カテゴリー名の変更、またはカテゴリーの削除ができます。
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>新しいカテゴリー名</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {/* フッターエリア：削除ボタンと保存・キャンセルボタンを左右に配置 */}
                        <DialogFooter className="justify-between">
                            {/* 削除ボタン：誤操作を防ぐため、AlertDialogで確認を挟む */}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive">削除</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            この操作は取り消せません。カテゴリーに属する全てのボックスと復習物が削除されます。
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

                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={onClose}>
                                    キャンセル
                                </Button>
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? '保存中...' : '保存'}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};