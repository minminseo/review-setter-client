import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NumberInput } from "@heroui/number-input";
import { createPattern } from '@/api/patternApi';
import { usePatternStore } from '@/store';
import { CreatePatternRequest, TargetWeight } from '@/types';
import { useTranslation } from 'react-i18next';

// UI
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FaPlusCircle, FaTrashAlt } from "react-icons/fa";
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { TFunction } from 'i18next';

const patternSchema = (t: TFunction) => z.object({
    name: z.string().min(1, t('validation.patternNameRequired')),
    target_weight: z.enum(['heavy', 'normal', 'light', 'unset']),
    // `steps`はオブジェクトの配列として定義する
    steps: z.array(z.object({
        // `coerce`を使い、入力された文字列を数値に変換してからバリデーションする
        interval_days: z.coerce.number().min(1),
    })).min(1),
});

type CreatePatternModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

/**
 * 新しいパターンを作成するためのモーダル。
 * react-hook-formのuseFieldArrayを使い、動的にステップの数を増減させる機能を持つ。
 */
export const CreatePatternModal = ({ isOpen, onClose }: CreatePatternModalProps) => {
    const { t } = useTranslation();

    const schema = patternSchema(t);

    const queryClient = useQueryClient();
    const addPatternToStore = usePatternStore((state) => state.addPattern);

    const form = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        // フォームの初期値。ステップは最低1つ表示しておく。
        defaultValues: {
            name: '',
            target_weight: 'normal',
            steps: [{ interval_days: 1 }],
        },
    });

    // 動的なフォームフィールド（ステップ）を管理するためのフック
    const { fields, append, remove, insert } = useFieldArray({
        control: form.control,
        name: "steps", // 'steps'という名前のフィールド配列を操作する
    });

    // ステップ間に追加する関数
    function insertStepBetween(index: number) {
        insert(index + 1, { interval_days: 1 });
    }

    // パターン作成APIを呼び出すためのmutation
    const mutation = useMutation({
        mutationFn: (data: CreatePatternRequest) => createPattern(data),
        onSuccess: (newPattern) => {
            queryClient.invalidateQueries({ queryKey: ['patterns'] });
            addPatternToStore(newPattern);
            toast.success(t('notification.patternCreated'));
            onClose();
        },
        onError: (error) => toast.error(t('error.updateFailed', { message: error.message })),
    });

    // 保存ボタンが押されたときの処理
    const onSubmit = (values: z.infer<typeof schema>) => {
        // ステップの数値を配列で取得
        const stepValues = values.steps.map((step) => step.interval_days);

        // 重複チェック
        const hasDuplicates = stepValues.some((value, index) => stepValues.indexOf(value) !== index);
        if (hasDuplicates) {
            toast.error(t('pattern.duplicateStepError'));
            return;
        }

        // 昇順チェック
        const isAscending = stepValues.every((value, index) => {
            if (index === 0) return true;
            return value > stepValues[index - 1];
        });
        if (!isAscending) {
            toast.error(t('pattern.stepOrderError'));
            return;
        }

        // ステップサイズチェック（32768以上）
        const hasLargeStep = stepValues.some((value) => value >= 32768);
        if (hasLargeStep) {
            toast.error(t('pattern.steoSizeError'));
            return;
        }

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
            <DialogContent className="w-screen max-w-none sm:max-w-none min-w-0 h-[700px] max-h-full flex flex-col">
                <DialogHeader>
                    <DialogTitle className=" border-b pb-2">{t('pattern.create')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 space-y-2 min-h-0">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem className="w-full">
                                <FormLabel className="inline-block pointer-events-none select-none">{t('pattern.name')}</FormLabel>
                                <div className="w-full">
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="target_weight" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="inline-block pointer-events-none select-none">{t('pattern.weight')}</FormLabel>
                                <div className="w-full">
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="heavy">{t('pattern.heavy')}</SelectItem>
                                            <SelectItem value="normal">{t('pattern.normal')}</SelectItem>
                                            <SelectItem value="light">{t('pattern.light')}</SelectItem>
                                            <SelectItem value="unset">{t('pattern.unset')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormMessage />
                        <div className="flex items-center gap-2 mb-2">
                            <FormLabel className="whitespace-nowrap inline-block pointer-events-none select-none">{t('pattern.steps')}</FormLabel>
                            <Button type="button" variant="outline" size="sm" className="flex items-center gap-1" onClick={() => append({ interval_days: 1 })}>
                                <FaPlusCircle className="h-4 w-4" /> {t('common.create')}
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="flex items-center gap-1" onClick={() => { if (fields.length > 1) remove(fields.length - 1); }}>
                                <FaTrashAlt className="h-4 w-4" /> {t('common.delete')}
                            </Button>
                        </div>
                        <div className="flex-1 min-h-0">
                            <ScrollArea className="w-full h-full border-t">
                                <div className="space-y-2 pt-2">
                                    <div className="max-w-full">
                                        <div className="flex flex-wrap gap-x-0 mb-0 pr-0 pl-0 mr-0 ml-0 gap-y-4 pb-4">
                                            {fields.map((field, index) => {
                                                const stepperBetween = index !== 0 ? (
                                                    <div key={`between-${field.id}`} className="flex flex-col items-center justify-center min-w-[24px]">
                                                        <Button type="button" variant="ghost" size="icon" className="mb-0 pr-0 pl-0 mr-0 ml-0" onClick={() => insertStepBetween(index - 1)}>
                                                            <FaPlusCircle className="h-4 w-4  text-primary" />
                                                        </Button>
                                                        <div className="h-6" />
                                                    </div>
                                                ) : null;
                                                const stepBox = (
                                                    <div key={field.id} className="flex flex-col items-center relative min-w-[60px]">
                                                        <div className="pr-6 text-xs text-gray-400">{index + 1}</div>
                                                        <FormField control={form.control} name={`steps.${index}.interval_days`} render={({ field: stepField }) => (
                                                            <FormItem>
                                                                <FormLabel className="hidden" />
                                                                <FormControl>
                                                                    <NumberInput
                                                                        {...stepField}
                                                                        value={typeof stepField.value === 'number' ? stepField.value : undefined}
                                                                        placeholder="未入力"
                                                                        min={1}
                                                                        aria-label={`${t('pattern.step')} ${index + 1} ${t('pattern.intervalDays')}`}
                                                                        onChange={val => {
                                                                            if (typeof val === 'number' && val >= 1) stepField.onChange(val);
                                                                            else if (val === undefined) stepField.onChange(undefined);
                                                                        }}
                                                                        classNames={{
                                                                            input: "text-center w-16 h-10 bg-gray-800 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-primary placeholder:text-gray-500",
                                                                            stepperButton: "p-0 h-5 w-6 text-white",
                                                                            stepperWrapper: "flex flex-col justify-center",
                                                                            innerWrapper: "flex items-center",
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />
                                                        <Button type="button" variant="ghost" size="icon" className="mr-6 mt-1" onClick={() => fields.length > 1 && remove(index)}>
                                                            <FaTrashAlt className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                );
                                                return [stepperBetween, stepBox];
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                            </ScrollArea>
                        </div>
                        <div className="bottom-0 right-0">
                            <DialogFooter>
                                <div className="flex gap-3 absolute right-3 bottom-3">
                                    <Button type="button" variant="outline" onClick={onClose}>{t('common.close')}</Button>
                                    <Button type="submit" disabled={mutation.isPending}>
                                        {mutation.isPending ? t('loading.creating') : t('common.create')}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};