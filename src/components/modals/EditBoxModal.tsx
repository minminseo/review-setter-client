import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { updateBox, deleteBox } from '@/api/boxApi';
import { fetchPatterns } from '@/api/patternApi';
import { useBoxStore, usePatternStore } from '@/store';
import { GetBoxOutput, GetCategoryOutput, PatternResponse, UpdateBoxInput } from '@/types';

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

// Nested Modal
import { SelectPatternModal } from './SelectPatternModal';
import NameCell from '@/components/shared/NameCell';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

// フォームのバリデーションルール
const boxSchema = z.object({
    name: z.string().min(1, 'Box name is required.'),
    pattern_id: z.string().uuid().nullable().optional(),
});

type EditBoxModalProps = {
    isOpen: boolean;
    onClose: () => void;
    box: GetBoxOutput;
    category: GetCategoryOutput;
};

/**
 * 既存の復習物ボックスを編集・削除するためのモーダル。
 */
export const EditBoxModal = ({ isOpen, onClose, box, category }: EditBoxModalProps) => {
    const queryClient = useQueryClient();
    const { updateBox: updateInStore, removeBox: removeFromStore } = useBoxStore();
    const { setPatterns } = usePatternStore();

    const [isPatternModalOpen, setPatternModalOpen] = React.useState(false);
    const [selectedPatternName, setSelectedPatternName] = React.useState('未選択');

    // フォームの初期化。propsで渡されたboxのデータで初期値を設定する
    const form = useForm<z.infer<typeof boxSchema>>({
        resolver: zodResolver(boxSchema),
        values: {
            name: box.name,
            pattern_id: box.pattern_id,
        },
    });

    // パターンリストを取得するためのクエリ
    const { data: fetchedPatterns, isSuccess } = useQuery({
        queryKey: ['patterns'],
        queryFn: fetchPatterns,
        staleTime: 1000 * 60 * 5,
    });

    // パターンリスト取得後、初期のパターン名をUIに反映し、ストアも更新
    React.useEffect(() => {
        if (isSuccess && fetchedPatterns) {
            setPatterns(fetchedPatterns);
            if (fetchedPatterns.length > 0 && box.pattern_id) {
                const initialPattern = fetchedPatterns.find(p => p.id === box.pattern_id);
                setSelectedPatternName(initialPattern?.name || '未選択');
            } else if (box.pattern_id) {
                // patterns is empty but box has pattern_id - pattern was deleted
                setSelectedPatternName('未選択');
            } else {
                setSelectedPatternName('未選択');
            }
        }
    }, [isSuccess, fetchedPatterns, setPatterns, box.pattern_id]);

    // --- Mutations ---
    const updateMutation = useMutation({
        mutationFn: (data: UpdateBoxInput) => updateBox({ categoryId: category.id, boxId: box.id, data }),
        onSuccess: (updatedBox) => {
            queryClient.invalidateQueries({ queryKey: ['boxes', category.id] });
            updateInStore(category.id, updatedBox);
            toast.success('ボックスを更新しました！');
            onClose();
        },
        onError: (error: any) => {
            // 500ステータスコードの場合は、完了済み復習日があるエラーとして扱う
            if (error?.response?.status === 500) {
                toast.error('ボックス内に復習物が存在するためパターンを変更できません。');
            } else {
                toast.error(`Update failed: ${error.message}`);
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteBox({ categoryId: category.id, boxId: box.id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boxes', category.id] });
            removeFromStore(category.id, box.id);
            toast.success('Box deleted successfully!');
            onClose();
        },
        onError: (error: any) => toast.error(`Delete failed: ${error.message}`),
    });

    const handleSelectPattern = (pattern: PatternResponse) => {
        form.setValue('pattern_id', pattern.id);
        setSelectedPatternName(pattern.name);
        setPatternModalOpen(false);
    };

    const onSubmit = (values: z.infer<typeof boxSchema>) => {
        updateMutation.mutate(values);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="w-[95vw] max-w-lg h-[350px] max-h-[95vh] flex flex-col">
                    <div className="h-full flex flex-col ">
                        <div className="flex-1 flex flex-col ">

                            <DialogHeader>
                                <DialogTitle className="border-b pb-2">復習物ボックス編集モーダル</DialogTitle>
                                <DialogDescription>
                                    <div className="mb-1 font-semibold text-white">カテゴリー名</div>
                                    <div className="mb-2 text-lg">
                                        <NameCell name={category.name} maxWidth={500} />
                                    </div>
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                                    {/* FormFieldを正しく使用してフォームフィールドを実装 */}
                                    <ScrollArea className="flex-1 min-h-0 max-h-[calc(100vh-200px)]">
                                        <div className="space-y-4 py-4">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="inline-block pointer-events-none select-none">ボックス名</FormLabel>
                                                        <div className="w-full">
                                                            <FormControl><Input {...field} /></FormControl>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">復習パターン</FormLabel>
                                                <Button type="button" variant="outline" className="w-full mb-3 max-w-full  justify-start font-normal truncate" onClick={() => setPatternModalOpen(true)}>
                                                    {selectedPatternName}
                                                </Button>
                                            </FormItem>
                                        </div>
                                        <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                                    </ScrollArea>
                                    <DialogFooter className="justify-end ">
                                        <div className="flex items-center gap-2 w-full justify-between">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" className="absolute left-3 bottom-3">削除</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>本当に削除しますか？</AlertDialogTitle></AlertDialogHeader>
                                                    <AlertDialogDescription>この操作は取り消せません。ボックスに属する全ての復習物は、このカテゴリーの未分類ボックスに移動されます。</AlertDialogDescription>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                                                            {deleteMutation.isPending ? '削除中...' : '削除する'}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            <div className="flex gap-3 absolute right-3 bottom-3">
                                                <Button type="button" variant="outline" onClick={onClose}>キャンセル</Button>
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

            <SelectPatternModal
                isOpen={isPatternModalOpen}
                onClose={() => setPatternModalOpen(false)}
                onSelect={handleSelectPattern}
            />
        </>
    );
};