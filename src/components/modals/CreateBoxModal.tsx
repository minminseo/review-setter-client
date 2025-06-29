import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

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
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import NameCell from '../shared/NameCell';


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
    const { t } = useTranslation();
    const [selectedPatternName, setSelectedPatternName] = React.useState(t('common.unclassified'));

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
            // toast.success('新しいボックスを作成しました！');
            toast.success(t('notification.boxCreated'));
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
        // パターンが未選択の場合はバリデーションエラーを表示
        if (!values.pattern_id) {
            // toast.error('パターン選択は必須です。');
            toast.error(t('validation.selectValidPattern'));
            return;
        }
        mutation.mutate(values);
    };

    // モーダルが閉じられたときに内部の状態をきれいにする副作用
    React.useEffect(() => {
        if (!isOpen) {
            form.reset();
            setSelectedPatternName(t('box.Unselected'));
        }
    }, [isOpen, form]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="w-[95vw] max-w-lg h-[400px] max-h-[95vh] flex flex-col">
                    <div className="h-full flex flex-col ">
                        <div className="flex-1 flex flex-col ">
                            <DialogHeader>
                                <DialogTitle className="border-b pb-2">{t('box.create')}</DialogTitle>
                                <DialogDescription>
                                    <div className="mb-1 font-semibold text-white">{t('category.name')}（{t('common.unclassified')}）</div>
                                    <div className="mb-2 text-lg">
                                        <NameCell name={categoryName} maxWidth={500} />
                                    </div>
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
                                                        <FormLabel className="inline-block pointer-events-none select-none">{t('box.name')}</FormLabel>
                                                        <div className="w-full">
                                                            <FormControl>
                                                                <Input
                                                                    placeholder={t('box.name')}
                                                                    {...field}
                                                                    className="w-full  text-ellipsis  whitespace-nowrap"
                                                                />
                                                            </FormControl>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('pattern.name')}</FormLabel>
                                                <div className="w-full">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="w-full mb-3 justify-start font-normal text-ellipsis  whitespace-nowrap"
                                                        onClick={() => setPatternModalOpen(true)}
                                                    >
                                                        {selectedPatternName}
                                                    </Button>
                                                </div>
                                            </FormItem>

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