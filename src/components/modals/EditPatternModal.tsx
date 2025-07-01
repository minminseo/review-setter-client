import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NumberInput } from "@heroui/number-input";
import { FaPlusCircle, FaTrashAlt } from "react-icons/fa";
import { useTranslation } from 'react-i18next';

import { updatePattern, deletePattern } from '@/api/patternApi';
import { usePatternStore } from '@/store';
import { PatternResponse, UpdatePatternRequest, TargetWeight, UpdatePatternStepField } from '@/types';

// UI Components
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

// フォームのバリデーションルール
const patternSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    target_weight: z.enum(['heavy', 'normal', 'light', 'unset']),
    // ステップは配列で、各要素は1以上の数字である必要がある
    steps: z.array(z.object({
        step_id: z.string().uuid().optional(), // 既存ステップのID
        interval_days: z.coerce.number().min(1, 'Interval must be at least 1 day.'),
    })).min(1, 'At least one step is required.'),
});

type EditPatternModalProps = {
    isOpen: boolean;
    onClose: () => void;
    pattern: PatternResponse; // 編集対象のパターンデータ
};

/**
 * 既存の復習パターンを編集・削除するためのモーダル。
 * react-hook-formのuseFieldArrayを使い、動的にステップの数を増減させる機能を持つ。
 */
export const EditPatternModal = ({ isOpen, onClose, pattern }: EditPatternModalProps) => {
    const queryClient = useQueryClient();
    const { updatePattern: updateInStore, removePattern: removeFromStore } = usePatternStore();
    const { t } = useTranslation();

    // フォームの初期化。propsで渡されたpatternデータで初期値を設定する
    const form = useForm<z.infer<typeof patternSchema>>({
        resolver: zodResolver(patternSchema),
        values: {
            name: pattern.name,
            target_weight: pattern.target_weight,
            steps: pattern.steps.map(s => ({
                step_id: s.pattern_step_id,
                interval_days: s.interval_days
            })),
        },
    });

    // 動的なフォームフィールド（ステップ）を管理するためのフック
    const { fields, append, remove, insert } = useFieldArray({
        control: form.control,
        name: "steps",
    });

    // パターン更新のmutation
    const updateMutation = useMutation({
        mutationFn: (data: UpdatePatternRequest) => updatePattern({ id: pattern.id, data }),
        onSuccess: (updatedPattern) => {
            queryClient.invalidateQueries({ queryKey: ['patterns'] });
            updateInStore(updatedPattern);
            toast.success(t('notification.patternUpdated'));
            onClose();
        },
        onError: (error: any) => {
            if (error?.response?.status === 500) {
                toast.error(t('notification.itemUpdatedError'));
            } else {
                toast.error(t('error.updateFailed', { message: error.message }));
            }
        },
    });

    // パターン削除のmutation
    const deleteMutation = useMutation({
        mutationFn: () => deletePattern(pattern.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patterns'] });
            removeFromStore(pattern.id);
            toast.success(t('notification.patternDeleted'));
            onClose();
        },
        onError: (error: any) => {
            if (error?.response?.status === 500) {
                toast.error(t('notification.itemUpdatedError'));
            } else {
                toast.error(t('error.deleteFailed', { message: error.message }));
            }
        },
    });

    // 保存ボタンが押されたときの処理
    const onSubmit = (values: z.infer<typeof patternSchema>) => {
        // 変更有無判定
        const isNameChanged = values.name !== pattern.name;
        const isWeightChanged = values.target_weight !== pattern.target_weight;
        // ステップ比較（数・順序・値）
        const origSteps = pattern.steps.map(s => s.interval_days);
        const newSteps = values.steps.map(s => s.interval_days);
        const isStepChanged = origSteps.length !== newSteps.length || origSteps.some((v, i) => v !== newSteps[i]);

        if (!isNameChanged && !isWeightChanged && !isStepChanged) {
            toast.info(t('common.noChanges'));
            return;
        }

        // APIが要求する形式にデータを整形
        const data: UpdatePatternRequest = {
            name: values.name,
            target_weight: values.target_weight as TargetWeight,
            steps: values.steps.map((step, index) => ({
                step_id: step.step_id || '', // 新規ステップの場合はIDが空
                step_number: index + 1,
                interval_days: step.interval_days,
            })) as UpdatePatternStepField[],
        };
        updateMutation.mutate(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-screen max-w-none sm:max-w-none min-w-0 h-[700px] max-h-full flex flex-col">
                <DialogHeader>
                    <DialogTitle className=" border-b pb-2">{t('pattern.edit')}</DialogTitle>
                    <DialogDescription>{pattern.name}</DialogDescription>
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
                                                        <Button type="button" variant="ghost" size="icon" className="mb-0 pr-0 pl-0 mr-0 ml-0" onClick={() => insert(index, { interval_days: 1 })}>
                                                            <FaPlusCircle className="h-4 w-4 text-primary" />
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
                                                                        placeholder={t('common.unset')}
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
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="absolute left-3 bottom-3">{t('common.delete')}</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('common.confirmDelete', { name: pattern.name, defaultValue: t('box.deleteCompletely', { name: pattern.name, defaultValue: `本当に「${pattern.name}」を削除しますか？` }) })}</AlertDialogTitle>
                                        </AlertDialogHeader>
                                        <AlertDialogDescription>{t('pattern.deleteDescription')}</AlertDialogDescription>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => deleteMutation.mutate()}
                                                disabled={deleteMutation.isPending}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                                {deleteMutation.isPending ? t('loading.deleting') : t('common.delete')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <div className="flex gap-3 absolute right-3 bottom-3">

                                    <Button type="button" variant="outline" onClick={onClose}>{t('common.close')}</Button>
                                    <Button type="submit" disabled={updateMutation.isPending}>
                                        {updateMutation.isPending ? t('loading.saving') : t('common.save')}
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