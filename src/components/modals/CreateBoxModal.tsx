import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { createBox } from '@/api/boxApi';
import { useBoxStore } from '@/store';
import { PatternResponse, CreateBoxInput } from '@/types';

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

import { SelectPatternModal } from './SelectPatternModal';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import NameCell from '../shared/NameCell';


const createBoxSchema = (t: TFunction) => z.object({
    name: z.string().min(1, t('validation.boxNameRequired')),
    pattern_id: z.string().uuid().nullable().optional(),
});

type CreateBoxModalProps = {
    isOpen: boolean;
    onClose: () => void;
    categoryId: string; // どのカテゴリー内にボックスを作成するかを示すID
    categoryName: string; // モーダル内で表示するためのカテゴリー名
};

/**
 * 新しい復習物ボックスを作成するためのモーダル。
 * このモーダル内から、さらにパターン選択モーダルを呼び出す機能を持つ。
 */
export const CreateBoxModal = ({ isOpen, onClose, categoryId, categoryName }: CreateBoxModalProps) => {
    const queryClient = useQueryClient();
    const addBoxToStore = useBoxStore((state) => state.addBox);

    // ネストされた「パターン選択モーダル」の開閉状態を管理
    const [isPatternModalOpen, setPatternModalOpen] = React.useState(false);
    // 選択されたパターンの名前をUIに表示するために管理
    const { t } = useTranslation();
    const [selectedPatternName, setSelectedPatternName] = React.useState(t('common.unclassified'));

    // react-hook-formを使ってフォームの状態とバリデーションを管理
    const form = useForm<z.infer<ReturnType<typeof createBoxSchema>>>({
        resolver: zodResolver(createBoxSchema(t)),
        defaultValues: { name: '', pattern_id: null },
    });

    // ボックス作成APIを呼び出すためのmutationを定義
    const mutation = useMutation({
        mutationFn: (data: CreateBoxInput) => createBox({ categoryId, data }),
        onSuccess: (newBox) => {
            // 関連するボックスリストのキャッシュを無効化し、次回表示時に再取得させる
            queryClient.invalidateQueries({ queryKey: ['boxes', categoryId] });
            // Zustandストアにも新しいボックスを追加し、UIに即時反映させる
            addBoxToStore(categoryId, newBox);
            toast.success(t('notification.boxCreated'));
            onClose();
        },
        onError: (error) => toast.error(`Failed to create box: ${error.message}`),
    });

    // パターン選択モーダルからパターンが選択されたときに呼ばれるコールバック関数
    const handleSelectPattern = (pattern: PatternResponse) => {
        form.setValue('pattern_id', pattern.id);
        setSelectedPatternName(pattern.name);
        setPatternModalOpen(false);
    };
    const onSubmit = (values: z.infer<ReturnType<typeof createBoxSchema>>) => {
        if (!values.pattern_id) {
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
                                    <span className="block mb-1 font-semibold text-white">{t('category.label')}</span>
                                    <span className="block mb-2 text-lg">
                                        <NameCell name={categoryName} maxWidth={500} />
                                    </span>
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
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('pattern.label')}</FormLabel>
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

            <SelectPatternModal
                isOpen={isPatternModalOpen}
                onClose={() => setPatternModalOpen(false)}
                onSelect={handleSelectPattern}
            />
        </>
    );
};