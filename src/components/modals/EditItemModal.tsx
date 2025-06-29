import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

import * as React from 'react';

// API関数
import { updateItem, deleteItem, markItemAsFinished } from '@/api/itemApi';
import { fetchCategories } from '@/api/categoryApi';
import { fetchBoxes } from '@/api/boxApi';
import { fetchPatterns } from '@/api/patternApi';

// Zustandストア
import { useItemStore } from '@/store';

// 型定義とユーティリティ
import { ItemResponse, UpdateItemRequest } from '@/types';
import { cn } from '@/lib/utils';

// UIコンポーネント
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

const createItemSchema = (t: TFunction) => z.object({
    name: z.string().min(1, t('validation.itemNameRequired')),
    detail: z.string().optional(),
    learned_date: z.date({ required_error: t('validation.learningDateRequired') }),
    category_id: z.union([
        z.string().uuid(t('validation.selectValidCategory')),
        z.literal("UNCLASSIFIED")
    ]).nullable().optional(),
    box_id: z.union([
        z.string().uuid(t('validation.selectValidBox')),
        z.literal("UNCLASSIFIED")
    ]).nullable().optional(),
    pattern_id: z.string().uuid(t('validation.selectValidPattern')).nullable().optional(),
});

type EditItemModalProps = {
    isOpen: boolean;
    onClose: () => void;
    item: ItemResponse;
};

export const EditItemModal = ({ isOpen, onClose, item }: EditItemModalProps) => {
    const { t } = useTranslation();
    const itemSchema = React.useMemo(() => createItemSchema(t), [t]);

    const queryClient = useQueryClient();
    const { updateItemInBox, removeItemFromBox, addItemToBox } = useItemStore();

    const form = useForm<z.infer<typeof itemSchema>>({
        resolver: zodResolver(itemSchema),
        values: {
            name: item.name,
            detail: item.detail || '',
            learned_date: new Date(item.learned_date),
            category_id: item.category_id || 'UNCLASSIFIED',
            box_id: item.box_id || 'UNCLASSIFIED',
            pattern_id: item.pattern_id,
        },
    });

    const watchedCategoryId = form.watch('category_id');
    const watchedBoxId = form.watch('box_id');

    // データ取得: フォームの選択肢を生成するために必要
    const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: Infinity });
    const { data: boxes = [] } = useQuery({
        queryKey: ['boxes', watchedCategoryId],
        queryFn: () => fetchBoxes(watchedCategoryId!),
        enabled: !!watchedCategoryId,
    });
    const { data: patterns = [] } = useQuery({ queryKey: ['patterns'], queryFn: fetchPatterns, staleTime: Infinity });

    // 復習パターンの間隔配列が完全に一致するかを判定する関数
    const arePatternIntervalsEqual = (pattern1: any, pattern2: any): boolean => {
        if (!pattern1 || !pattern2) return false;
        if (!pattern1.steps || !pattern2.steps) return false;

        const intervals1 = pattern1.steps
            .sort((a: any, b: any) => a.step_number - b.step_number)
            .map((step: any) => step.interval_days);
        const intervals2 = pattern2.steps
            .sort((a: any, b: any) => a.step_number - b.step_number)
            .map((step: any) => step.interval_days);

        if (intervals1.length !== intervals2.length) return false;
        return intervals1.every((interval: number, index: number) => interval === intervals2[index]);
    };

    // 復習物が完了済みの復習日を持っているかどうかをチェックする関数
    const hasCompletedReviews = (): boolean => {
        return item.review_dates?.some(reviewDate => reviewDate.is_completed) ?? false;
    };

    // 現在のアイテムの復習パターンと一致するボックスのみをフィルタリング
    const filteredBoxes = React.useMemo(() => {
        // 完了済みの復習日がない場合は、復習パターンに関係なく全てのボックスを表示
        if (!hasCompletedReviews()) {
            return boxes;
        }

        if (!item.pattern_id || patterns.length === 0) return boxes; // パターンが未設定またはパターンが存在しない場合は全ボックス表示

        const currentPattern = patterns.find(p => p.id === item.pattern_id);
        if (!currentPattern) return boxes;

        return boxes.filter(box => {
            if (!box.pattern_id) return false; // パターンが未設定のボックスは除外
            const boxPattern = patterns.find(p => p.id === box.pattern_id);
            return arePatternIntervalsEqual(currentPattern, boxPattern);
        });
    }, [boxes, patterns, item.pattern_id, item.review_dates, hasCompletedReviews]);

    // 選択されたボックスの情報を取得（フィルタリング後のリストから）
    const selectedBox = watchedBoxId ? filteredBoxes.find(box => box.id === watchedBoxId) : null;

    // ボックスが選択されている場合は復習パターン選択を無効化（未分類は除く）
    const watchedBoxIdValue = form.watch('box_id');
    const isPatternDisabled = !!selectedBox && watchedBoxIdValue !== 'UNCLASSIFIED';

    // ボックス選択時に自動で復習パターンを設定する
    React.useEffect(() => {
        const watchedBoxIdValue = form.watch('box_id');

        // 通常のボックスが選択された場合のみ、そのボックスのパターンに変更
        if (selectedBox && selectedBox.pattern_id && watchedBoxIdValue !== 'UNCLASSIFIED') {
            form.setValue('pattern_id', selectedBox.pattern_id);
        }
        // 未分類ボックス選択時や、ボックス選択解除時は復習パターンを変更しない
        // （元の復習パターンを維持）
    }, [selectedBox, form]);

    const updateMutation = useMutation({
        mutationFn: (data: UpdateItemRequest) => updateItem({ itemId: item.item_id, data }),
        onSuccess: (updatedItem, variables) => {
            toast.success(t('notification.itemUpdated'));

            // 重要：APIレスポンスにreview_datesが不完全な場合、元のデータで補完
            const enrichedUpdatedItem = {
                ...updatedItem,
                review_dates: updatedItem.review_dates && updatedItem.review_dates.length > 0
                    ? updatedItem.review_dates
                    : item.review_dates // 元のreview_datesを保持
            };

            const oldBoxId = item.box_id;
            const newBoxId = variables.box_id;
            const oldCategoryId = item.category_id;
            const newCategoryId = variables.category_id;

            // キャッシュキーを正しく生成する関数
            const getQueryKey = (boxId: string | null | undefined, categoryId: string | null | undefined) => {
                if (!boxId || boxId === 'unclassified') {
                    return ['items', 'unclassified', categoryId || 'unclassified'];
                }
                return ['items', boxId, categoryId];
            };

            // Zustandストアのキー計算関数
            const getStoreBoxId = (boxId: string | null | undefined, categoryId: string | null | undefined) => {
                if (!boxId || boxId === 'unclassified') {
                    if (!categoryId || categoryId === 'unclassified') {
                        return 'unclassified';
                    }
                    return `unclassified-${categoryId}`;
                }
                return boxId;
            };

            // 1. Zustandストアを即座にサーバーレスポンスで更新
            const oldStoreBoxId = getStoreBoxId(oldBoxId, oldCategoryId);
            const newStoreBoxId = getStoreBoxId(newBoxId, newCategoryId);

            if (oldStoreBoxId !== newStoreBoxId) {
                // ボックス間移動の場合
                if (oldStoreBoxId) {
                    removeItemFromBox(oldStoreBoxId, item.item_id);
                }
                if (newStoreBoxId) {
                    addItemToBox(newStoreBoxId, enrichedUpdatedItem);
                }
            } else {
                // 同じボックス内での更新
                if (oldStoreBoxId) {
                    updateItemInBox(oldStoreBoxId, enrichedUpdatedItem);
                }
            }

            // 2. TanStack Queryのキャッシュも直接更新
            const oldQueryKey = getQueryKey(oldBoxId, oldCategoryId);
            const newQueryKey = getQueryKey(newBoxId, newCategoryId);

            // 元のクエリキーからアイテムを削除（移動またはカテゴリ変更の場合）
            if (oldBoxId !== newBoxId || oldCategoryId !== newCategoryId) {
                queryClient.setQueryData(oldQueryKey, (oldData: any) => {
                    if (!oldData) return oldData;
                    return oldData.filter((i: any) => i.item_id !== enrichedUpdatedItem.item_id);
                });

                // 移動先のキャッシュが存在しない場合は無効化して再取得
                const existingNewData = queryClient.getQueryData(newQueryKey);
                if (!existingNewData) {
                    queryClient.invalidateQueries({ queryKey: newQueryKey });
                } else {
                    // 移動先のキャッシュが存在する場合のみ直接更新
                    queryClient.setQueryData(newQueryKey, (oldData: any) => {
                        if (!oldData) return [enrichedUpdatedItem];

                        const existingIndex = oldData.findIndex((i: any) => i.item_id === enrichedUpdatedItem.item_id);
                        if (existingIndex >= 0) {
                            // 既存アイテムを更新
                            const newData = [...oldData];
                            newData[existingIndex] = enrichedUpdatedItem;
                            return newData;
                        }
                        // 新しいアイテムを追加
                        return [...oldData, enrichedUpdatedItem];
                    });
                }
            } else {
                // 同じボックス内での更新の場合
                queryClient.setQueryData(newQueryKey, (oldData: any) => {
                    if (!oldData) return [enrichedUpdatedItem];

                    const existingIndex = oldData.findIndex((i: any) => i.item_id === enrichedUpdatedItem.item_id);
                    if (existingIndex >= 0) {
                        const newData = [...oldData];
                        newData[existingIndex] = enrichedUpdatedItem;
                        return newData;
                    }
                    return oldData;
                });
            }

            // 3. 関連データの無効化
            queryClient.invalidateQueries({ queryKey: ['todaysReviews'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            queryClient.invalidateQueries({ queryKey: ['finishedItems'] });

            onClose();
        },
        onError: (err: any) => {
            if (err?.response?.status === 400) {
                toast.error(t('notification.itemUpdatedError'));
            } else {
                toast.error(
                    t('error.updateFailed', { message: err?.message || '' })
                );
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteItem(item.item_id),
        onSuccess: () => {
            toast.success(t('notification.itemDeleted'));
            queryClient.invalidateQueries({ queryKey: ['items', item.box_id] });
            if (item.box_id) {
                removeItemFromBox(item.box_id, item.item_id);
            }
            onClose();
        },
        onError: (err: any) => {
            toast.error(
                t('error.deleteFailed', { message: err?.message || '' })
            );
        },
    });

    const finishMutation = useMutation({
        mutationFn: () => markItemAsFinished(item.item_id),
        onSuccess: () => {
            toast.success(t('notification.markItemAsFinished'));

            // 完了済みアイテムは通常のアイテムリストから削除する
            if (item.box_id) {
                removeItemFromBox(item.box_id, item.item_id);
            }

            // React Queryのキャッシュから直接削除
            if (item.box_id && item.box_id !== 'unclassified') {
                // 通常のボックス
                queryClient.setQueryData(['items', item.box_id, item.category_id], (oldData: any) => {
                    if (!oldData) return oldData;
                    return oldData.filter((i: any) => i.item_id !== item.item_id);
                });
            } else if (item.category_id && item.category_id !== 'unclassified') {
                // カテゴリー内の未分類ボックス
                queryClient.setQueryData(['items', 'unclassified', item.category_id], (oldData: any) => {
                    if (!oldData) return oldData;
                    return oldData.filter((i: any) => i.item_id !== item.item_id);
                });
            } else {
                // 完全未分類
                queryClient.setQueryData(['items', 'unclassified', 'unclassified'], (oldData: any) => {
                    if (!oldData) return oldData;
                    return oldData.filter((i: any) => i.item_id !== item.item_id);
                });
            }

            // 関連データの無効化
            queryClient.invalidateQueries({ queryKey: ['finishedItems'] });
            queryClient.invalidateQueries({ queryKey: ['todaysReviews'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });

            onClose();
        },
        onError: (err: any) => {
            toast.error(
                t('error.updateFailed', { message: err?.message || '' })
            );
        },
    });

    const onSubmit = (values: z.infer<typeof itemSchema>) => {
        const data: UpdateItemRequest = {
            ...values,
            // UNCLASSIFIEDをnullに変換（未分類として正しく送信）
            category_id: values.category_id === 'UNCLASSIFIED' ? null : values.category_id,
            box_id: values.box_id === 'UNCLASSIFIED' ? null : values.box_id,
            learned_date: format(values.learned_date, "yyyy-MM-dd"),
            today: format(new Date(), "yyyy-MM-dd"),
            is_mark_overdue_as_completed: true,
        };
        updateMutation.mutate(data);
    };

    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg h-[700px] max-h-[95vh] flex flex-col">
                <div className="h-full flex flex-col overflow-hidden">
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <DialogHeader>
                            <div className="pb-2">
                                <DialogTitle>{t('item.edit')}</DialogTitle>
                            </div>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                                <ScrollArea className="flex-1 border-t min-h-0 max-h-[calc(100vh-200px)]">
                                    <div className="space-y-4 py-4">
                                        <FormField name="name" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('item.name')}</FormLabel>
                                                <div className=" w-full">
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="detail" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('item.detailOptional')}</FormLabel>
                                                <div className=" w-full">
                                                    <FormControl>
                                                        <Textarea {...field} />
                                                    </FormControl>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="learned_date" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('item.learningDate')}</FormLabel>
                                                <div>
                                                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button variant={"outline"} className={cn("w-[200px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                                    {field.value ? format(field.value, "PPP") : <span>{t('item.selectDate')}</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={(date) => {
                                                                    if (!date) {
                                                                        setIsCalendarOpen(false);
                                                                        return;
                                                                    }
                                                                    field.onChange(date);
                                                                    setIsCalendarOpen(false);
                                                                }}
                                                                disabled={(date) => date > new Date()}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="category_id" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('category.caategory')}</FormLabel>
                                                <div className="w-full">
                                                    <Select onValueChange={(value) => {
                                                        field.onChange(value);
                                                        // カテゴリー変更時はボックスを未分類に設定
                                                        form.setValue('box_id', 'UNCLASSIFIED');
                                                    }} value={field.value ?? "UNCLASSIFIED"}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full min-w-0 max-w-[450px]">
                                                                <SelectValue placeholder={t('category.selectCategoryOptional')} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="w-full min-w-0 max-w-[450px]">
                                                            <SelectItem value="UNCLASSIFIED">{t('common.unclassified')}</SelectItem>
                                                            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="box_id" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">
                                                    {t('box.box')}
                                                    {item.pattern_id && filteredBoxes.length < boxes.length && hasCompletedReviews() && (
                                                        <span className="text-xs text-muted-foreground ml-1">
                                                            {t('pattern.useBoxSetting')}
                                                        </span>
                                                    )}
                                                </FormLabel>
                                                <div className="w-full w-full">
                                                    <Select onValueChange={field.onChange} value={field.value ?? "UNCLASSIFIED"}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full min-w-0 max-w-[450px]">
                                                                <SelectValue placeholder={t('box.selectBox')} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="w-full min-w-0 max-w-[450px]">
                                                            <SelectItem value="UNCLASSIFIED">{t('common.unclassified')}</SelectItem>
                                                            {filteredBoxes.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <FormMessage />
                                                {item.pattern_id && filteredBoxes.length === 0 && hasCompletedReviews() && (
                                                    <p className="text-xs text-orange-600">
                                                        {t('box.noBoxMatchPattern')}
                                                    </p>
                                                )}
                                            </FormItem>
                                        )} />
                                        <FormField name="pattern_id" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('pattern.selectPattern')}{isPatternDisabled && ` (${t('pattern.useBoxSetting')})`}</FormLabel>
                                                <div className="w-full w-full">
                                                    <Select
                                                        onValueChange={field.onChange}
                                                        value={field.value ?? ""}
                                                        disabled={isPatternDisabled}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className={cn("w-full w-full overflow-hidden", isPatternDisabled ? "bg-muted text-muted-foreground" : "")}>
                                                                <SelectValue
                                                                    placeholder={isPatternDisabled ?
                                                                        (selectedBox?.pattern_id ?
                                                                            (patterns.length > 0 ? patterns.find(p => p.id === selectedBox.pattern_id)?.name || t('pattern.useBoxSetting') : t('pattern.useBoxSetting'))
                                                                            : t('pattern.unset'))
                                                                        : t('pattern.selectPattern')
                                                                    }
                                                                />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="w-[var(--radix-select-trigger-width)] min-w-0">
                                                            {patterns.length > 0 ? (
                                                                patterns.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                                                            ) : (
                                                                <div className="p-2 text-sm text-muted-foreground text-center">
                                                                    {t('pattern.noPatterns')}
                                                                </div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />

                                    </div>
                                    <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                                </ScrollArea>
                                <div className=" bottom-0">
                                    <DialogFooter className="justify-end">
                                        <div className="flex items-center gap-2 w-full justify-between">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" className="absolute left-3 bottom-3">{t('common.delete')}</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>{t('common.confirmDelete', { name: item.name, defaultValue: t('box.deleteCompletely', { name: item.name, defaultValue: `本当に「${item.name}」を削除しますか？` }) })}</AlertDialogTitle></AlertDialogHeader>
                                                    <AlertDialogDescription>{t('item.itemDescription')}</AlertDialogDescription>
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
                                            <div className="flex gap-3 absolute right-3 bottom-3 ">
                                                <Button type="button" variant="secondary" onClick={() => finishMutation.mutate()} disabled={finishMutation.isPending}>
                                                    {finishMutation.isPending ? t('loading.loading') : t('common.finish')}
                                                </Button>
                                                <Button type="button" variant="outline" onClick={onClose}>{t('common.close')}</Button>
                                                <Button type="submit" disabled={updateMutation.isPending}>
                                                    {updateMutation.isPending ? t('loading.saving') : t('common.save')}
                                                </Button>
                                            </div>
                                        </div>
                                    </DialogFooter>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};