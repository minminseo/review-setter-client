import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createBox } from '@/api/boxApi';
import { useBoxStore } from '@/store';
import { PatternResponse, CreateBoxInput } from '@/types';

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
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// このモーダルから呼び出す、別のモーダルをインポート
import { SelectPatternModal } from './SelectPatternModal';


// フォームのバリデーションルールをzodで定義
const boxSchema = z.object({
    // ボックス名は1文字以上必須
    name: z.string().min(1, 'Box name is required.'),
    // パターンIDはUUID形式の文字列、またはnull。必須ではない。
    pattern_id: z.string().uuid().nullable().optional(),
});

// このモーダルが親コンポーネントから受け取るPropsの型を定義
type CreateBoxModalProps = {
    isOpen: boolean;
    onClose: () => void;
    categoryId: string; // どのカテゴリー内にボックスを作成するかを示すID
    categoryName: string; // モーダル内で表示するためのカテゴリー名
};

/**
 * 新しい復習物ボックスを作成するためのモーダル。
 * このモーダル内から、さらに復習パターン選択モーダルを呼び出す機能を持つ。
 */
export const CreateBoxModal = ({ isOpen, onClose, categoryId, categoryName }: CreateBoxModalProps) => {
    // React Queryのキャッシュを操作するためのクライアント
    const queryClient = useQueryClient();
    // Zustandストアからボックスを追加するアクションを取得
    const addBoxToStore = useBoxStore((state) => state.addBox);

    // ネストされた「パターン選択モーダル」の開閉状態を管理
    const [isPatternModalOpen, setPatternModalOpen] = React.useState(false);
    // 選択されたパターンの名前をUIに表示するために管理
    const [selectedPatternName, setSelectedPatternName] = React.useState('未選択');

    // react-hook-formを使ってフォームの状態とバリデーションを管理
    const form = useForm<z.infer<typeof boxSchema>>({
        resolver: zodResolver(boxSchema),
        defaultValues: { name: '', pattern_id: null },
    });

    // ボックス作成APIを呼び出すためのmutationを定義
    const mutation = useMutation({
        mutationFn: (data: CreateBoxInput) => createBox({ categoryId, data }),
        // useMutationではonSuccessが利用可能。APIコールが成功した直後の処理を記述する。
        onSuccess: (newBox) => {
            // 関連するボックスリストのキャッシュを無効化し、次回表示時に再取得させる
            queryClient.invalidateQueries({ queryKey: ['boxes', categoryId] });
            // Zustandストアにも新しいボックスを追加し、UIに即時反映させる
            addBoxToStore(categoryId, newBox);
            toast.success('Box created successfully!');
            onClose(); // このモーダルを閉じる
        },
        onError: (error) => toast.error(`Failed to create box: ${error.message}`),
    });

    // パターン選択モーダルからパターンが選択されたときに呼ばれるコールバック関数
    const handleSelectPattern = (pattern: PatternResponse) => {
        form.setValue('pattern_id', pattern.id); // フォームの値を更新
        setSelectedPatternName(pattern.name);    // 表示用のstateを更新
        setPatternModalOpen(false);              // パターン選択モーダルを閉じる
    };

    // フォームの送信処理
    const onSubmit = (values: z.infer<typeof boxSchema>) => {
        mutation.mutate(values);
    };

    // モーダルが閉じられたときに内部の状態をきれいにする副作用
    React.useEffect(() => {
        if (!isOpen) {
            form.reset();
            setSelectedPatternName('未選択');
        }
    }, [isOpen, form]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>復習物ボックス作成モーダル</DialogTitle>
                        <DialogDescription>
                            「{categoryName}」内に新しいボックスを作成します。
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground">カテゴリー（指定不可）</p>
                                <p className="font-semibold">{categoryName}</p>
                            </div>

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>復習物ボックス名</FormLabel>
                                        <FormControl><Input placeholder="例: 基本文法, 応用問題" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormItem>
                                <FormLabel>復習パターン</FormLabel>
                                <Button type="button" variant="outline" className="w-full justify-start font-normal" onClick={() => setPatternModalOpen(true)}>
                                    {selectedPatternName}
                                </Button>
                                <FormDescription>
                                    指定しない場合、復習物は未分類として扱われます。
                                </FormDescription>
                            </FormItem>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={onClose}>キャンセル</Button>
                                <Button type="submit" disabled={mutation.isPending}>
                                    {mutation.isPending ? '作成中...' : '作成'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* ネストされたパターン選択モーダル */}
            {/* このモーダルは次のステップで実装します */}
            <SelectPatternModal
                isOpen={isPatternModalOpen}
                onClose={() => setPatternModalOpen(false)}
                onSelect={handleSelectPattern}
            />
        </>
    );
};