import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';

import { createPattern } from '@/api/patternApi';
import { usePatternStore } from '@/store';
import { CreatePatternRequest, TargetWeight } from '@/types';

// UI Components
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// フォームのバリデーションルール
const patternSchema = z.object({
    name: z.string().min(1, 'パターン名は必須です。'),
    target_weight: z.enum(['heavy', 'normal', 'light', 'unset']),
    // `steps`はオブジェクトの配列として定義する
    steps: z.array(z.object({
        // `coerce`を使い、入力された文字列を数値に変換してからバリデーションする
        interval_days: z.coerce.number().min(1, '復習間隔は1日以上である必要があります。'),
    })).min(1, '少なくとも1つのステップが必要です。'),
});

type CreatePatternModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

/**
 * 新しい復習パターンを作成するためのモーダル。
 * react-hook-formのuseFieldArrayを使い、動的にステップの数を増減させる機能を持つ。
 */
export const CreatePatternModal = ({ isOpen, onClose }: CreatePatternModalProps) => {
    const queryClient = useQueryClient();
    const addPatternToStore = usePatternStore((state) => state.addPattern);

    const form = useForm<z.infer<typeof patternSchema>>({
        resolver: zodResolver(patternSchema),
        // フォームの初期値。ステップは最低1つ表示しておく。
        defaultValues: {
            name: '',
            target_weight: 'normal',
            steps: [{ interval_days: 1 }],
        },
    });

    // 動的なフォームフィールド（ステップ）を管理するためのフック
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "steps", // 'steps'という名前のフィールド配列を操作する
    });

    // パターン作成APIを呼び出すためのmutation
    const mutation = useMutation({
        mutationFn: (data: CreatePatternRequest) => createPattern(data),
        onSuccess: (newPattern) => {
            // 成功した場合、キャッシュを無効化し、Zustandストアを更新する
            queryClient.invalidateQueries({ queryKey: ['patterns'] });
            addPatternToStore(newPattern);
            toast.success('新しい復習パターンを作成しました！');
            onClose();
        },
        onError: (error) => toast.error(`作成に失敗しました: ${error.message}`),
    });

    // 保存ボタンが押されたときの処理
    const onSubmit = (values: z.infer<typeof patternSchema>) => {
        // APIが要求する形式にデータを整形する
        const data: CreatePatternRequest = {
            ...values,
            target_weight: values.target_weight as TargetWeight,
            steps: values.steps.map((step, index) => ({
                // step_numberは配列のインデックスから生成する
                step_number: index + 1,
                interval_days: step.interval_days,
            })),
        };
        mutation.mutate(data);
    };

    // モーダルが閉じられたときにフォームをリセット
    React.useEffect(() => {
        if (!isOpen) {
            form.reset();
        }
    }, [isOpen, form]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>復習パターン作成モーダル</DialogTitle>
                    <DialogDescription>
                        新しい復習スケジュールのパターンを作成します。
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>パターン名</FormLabel><FormControl><Input {...field} placeholder="例: 短期集中プラン" /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="target_weight" render={({ field }) => (
                            <FormItem><FormLabel>重み</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="heavy">Heavy</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="light">Light</SelectItem>
                                        <SelectItem value="unset">Unset</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <div className="space-y-2">
                            <FormLabel>復習ステップ (日数)</FormLabel>
                            {/* 動的フィールドをループして、各ステップの入力欄を生成 */}
                            {fields.map((field, index) => (
                                <FormField key={field.id} control={form.control} name={`steps.${index}.interval_days`} render={({ field: stepField }) => (
                                    <FormItem className="flex items-center gap-2">
                                        <FormControl><Input type="number" {...stepField} /></FormControl>
                                        {/* 2つ以上のステップがある場合のみ削除ボタンを表示 */}
                                        {fields.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><TrashIcon className="h-4 w-4 text-destructive" /></Button>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            ))}
                            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ interval_days: 1 })}>
                                <PlusCircleIcon className="mr-2 h-4 w-4" />
                                ステップを追加
                            </Button>
                        </div>
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
    );
};