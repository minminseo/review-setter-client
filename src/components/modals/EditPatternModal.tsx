import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';

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
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "steps",
    });

    // パターン更新のmutation
    const updateMutation = useMutation({
        mutationFn: (data: UpdatePatternRequest) => updatePattern({ id: pattern.id, data }),
        onSuccess: (updatedPattern) => {
            queryClient.invalidateQueries({ queryKey: ['patterns'] });
            updateInStore(updatedPattern);
            toast.success('Pattern updated successfully!');
            onClose();
        },
        onError: (error) => toast.error(`Update failed: ${error.message}`),
    });

    // パターン削除のmutation
    const deleteMutation = useMutation({
        mutationFn: () => deletePattern(pattern.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patterns'] });
            removeFromStore(pattern.id);
            toast.success('Pattern deleted successfully!');
            onClose();
        },
        onError: (error) => toast.error(`Delete failed: ${error.message}`),
    });

    // 保存ボタンが押されたときの処理
    const onSubmit = (values: z.infer<typeof patternSchema>) => {
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
            <DialogContent>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="absolute top-4 right-16">削除</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>本当に削除しますか？</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogDescription>この操作は取り消せません。このパターンを使用しているボックスのスケジュールに影響が出る可能性があります。</AlertDialogDescription>
                        <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                                {deleteMutation.isPending ? '削除中...' : '削除する'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <DialogHeader>
                    <DialogTitle>復習パターン変更モーダル</DialogTitle>
                    <DialogDescription>{pattern.name}</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>パターン名</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
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
                        <div>
                            <FormLabel>復習ステップ (日数)</FormLabel>
                            {fields.map((field, index) => (
                                <FormField key={field.id} control={form.control} name={`steps.${index}.interval_days`} render={({ field: stepField }) => (
                                    <FormItem className="flex items-center gap-2 mt-2">
                                        <FormControl><Input type="number" {...stepField} /></FormControl>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><TrashIcon className="h-4 w-4 text-destructive" /></Button>
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
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? '保存中...' : '保存'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};