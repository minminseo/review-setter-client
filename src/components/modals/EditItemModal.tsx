import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

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

const itemSchema = z.object({
    name: z.string().min(1, "復習物名は必須です。"),
    detail: z.string().optional(),
    learned_date: z.date({ required_error: "学習日は必須です。" }),
    category_id: z.string().uuid().nullable().optional(),
    box_id: z.string().uuid().nullable().optional(),
    pattern_id: z.string().uuid().nullable().optional(),
});

type EditItemModalProps = {
    isOpen: boolean;
    onClose: () => void;
    item: ItemResponse;
};

export const EditItemModal = ({ isOpen, onClose, item }: EditItemModalProps) => {
    const queryClient = useQueryClient();
    const { updateItemInBox, removeItemFromBox, addItemToBox } = useItemStore();

    const form = useForm<z.infer<typeof itemSchema>>({
        resolver: zodResolver(itemSchema),
        values: {
            name: item.name,
            detail: item.detail || '',
            learned_date: new Date(item.learned_date),
            category_id: item.category_id,
            box_id: item.box_id,
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

    // 現在のアイテムの復習パターンと一致するボックスのみをフィルタリング
    const filteredBoxes = React.useMemo(() => {
        if (!item.pattern_id || patterns.length === 0) return boxes; // パターンが未設定またはパターンが存在しない場合は全ボックス表示
        
        const currentPattern = patterns.find(p => p.id === item.pattern_id);
        if (!currentPattern) return boxes;
        
        return boxes.filter(box => {
            if (!box.pattern_id) return false; // パターンが未設定のボックスは除外
            const boxPattern = patterns.find(p => p.id === box.pattern_id);
            return arePatternIntervalsEqual(currentPattern, boxPattern);
        });
    }, [boxes, patterns, item.pattern_id]);

    // 選択されたボックスの情報を取得（フィルタリング後のリストから）
    const selectedBox = watchedBoxId ? filteredBoxes.find(box => box.id === watchedBoxId) : null;
    
    // ボックスが選択されている場合は復習パターン選択を無効化
    const isPatternDisabled = !!selectedBox;

    // ボックス選択時に自動で復習パターンを設定する
    React.useEffect(() => {
        if (selectedBox && selectedBox.pattern_id) {
            form.setValue('pattern_id', selectedBox.pattern_id);
        } else if (!selectedBox) {
            // ボックスが選択解除された場合は復習パターンをクリア
            form.setValue('pattern_id', null);
        }
    }, [selectedBox, form]);

    const updateMutation = useMutation({
        mutationFn: (data: UpdateItemRequest) => updateItem({ itemId: item.item_id, data }),
        onSuccess: (updatedItem, variables) => {
            toast.success("アイテムを更新しました！");
            
            const oldBoxId = item.box_id;
            const newBoxId = variables.box_id;
            
            // 1. Zustandストアを即座にサーバーレスポンスで更新
            if (oldBoxId !== newBoxId) {
                // ボックス間移動の場合
                if (oldBoxId) {
                    removeItemFromBox(oldBoxId, item.item_id);
                }
                if (newBoxId) {
                    addItemToBox(newBoxId, updatedItem);
                }
            } else {
                // 同じボックス内での更新
                if (oldBoxId) {
                    updateItemInBox(oldBoxId, updatedItem);
                }
            }
            
            // 2. TanStack Queryのキャッシュも直接更新
            if (oldBoxId) {
                // 元のボックスのキャッシュからアイテムを削除
                queryClient.setQueryData(['items', oldBoxId, item.category_id], (oldData: any) => {
                    if (!oldData) return oldData;
                    return oldData.filter((item: any) => item.item_id !== updatedItem.item_id);
                });
            }
            
            if (newBoxId && newBoxId !== oldBoxId) {
                // 新しいボックスのキャッシュにアイテムを追加
                queryClient.setQueryData(['items', newBoxId, variables.category_id], (oldData: any) => {
                    if (!oldData) return [updatedItem];
                    // 既存アイテムに追加、または既存アイテムを更新
                    const existingIndex = oldData.findIndex((item: any) => item.item_id === updatedItem.item_id);
                    if (existingIndex >= 0) {
                        const newData = [...oldData];
                        newData[existingIndex] = updatedItem;
                        return newData;
                    }
                    return [...oldData, updatedItem];
                });
            } else if (oldBoxId) {
                // 同じボックス内での更新
                queryClient.setQueryData(['items', oldBoxId, item.category_id], (oldData: any) => {
                    if (!oldData) return [updatedItem];
                    return oldData.map((item: any) => 
                        item.item_id === updatedItem.item_id ? updatedItem : item
                    );
                });
            }
            
            // 3. 関連データの無効化
            queryClient.invalidateQueries({ queryKey: ['todaysReviews'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            queryClient.invalidateQueries({ queryKey: ['finishedItems'] });
            
            onClose();
        },
        onError: (err: any) => toast.error(`更新に失敗しました: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: () => deleteItem(item.item_id),
        onSuccess: () => {
            toast.success("アイテムを削除しました。");
            queryClient.invalidateQueries({ queryKey: ['items', item.box_id] });
            if (item.box_id) {
                removeItemFromBox(item.box_id, item.item_id);
            }
            onClose();
        },
        onError: (err: any) => toast.error(`削除に失敗しました: ${err.message}`),
    });

    const finishMutation = useMutation({
        mutationFn: () => markItemAsFinished(item.item_id),
        onSuccess: (updatedItem) => {
            toast.success("アイテムを完了済みにしました。");
            queryClient.invalidateQueries({ queryKey: ['items', item.box_id] });
            if (item.box_id) {
                updateItemInBox(item.box_id, updatedItem);
            }
            onClose();
        },
        onError: (err: any) => toast.error(`処理に失敗しました: ${err.message}`),
    });

    const onSubmit = (values: z.infer<typeof itemSchema>) => {
        const data: UpdateItemRequest = {
            ...values,
            learned_date: format(values.learned_date, "yyyy-MM-dd"),
            today: format(new Date(), "yyyy-MM-dd"),
            is_mark_overdue_as_completed: true,
        };
        updateMutation.mutate(data);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="absolute top-4 right-16">削除</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>本当に削除しますか？</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
                        <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                                {deleteMutation.isPending ? '削除中...' : '削除する'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <DialogHeader>
                    <DialogTitle>復習物編集モーダル</DialogTitle>
                    {/* DialogDescriptionを使用して、どのアイテムを編集しているかを示す */}
                    <DialogDescription>「{item.name}」の情報を編集します。</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <FormField name="name" control={form.control} render={({ field }) => (<FormItem><FormLabel>復習物名</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="detail" control={form.control} render={({ field }) => (<FormItem><FormLabel>詳細 (任意)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="learned_date" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>学習日</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>日付を選択</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent>
                                </Popover><FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="category_id" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>カテゴリー</FormLabel>
                                <Select onValueChange={(value) => { field.onChange(value); form.resetField('box_id'); }} value={field.value ?? ""}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="カテゴリーを選択 (任意)" /></SelectTrigger></FormControl>
                                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="box_id" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    ボックス
                                    {item.pattern_id && filteredBoxes.length < boxes.length && (
                                        <span className="text-xs text-muted-foreground ml-1">
                                            (同じ復習パターンのボックスのみ)
                                        </span>
                                    )}
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!watchedCategoryId}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="ボックスを選択 (任意)" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {filteredBoxes.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                {item.pattern_id && filteredBoxes.length === 0 && (
                                    <p className="text-xs text-orange-600">
                                        この復習パターンと一致するボックスがありません
                                    </p>
                                )}
                            </FormItem>
                        )} />
                        <FormField name="pattern_id" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>復習パターン{isPatternDisabled && " (ボックスの設定を使用)"}</FormLabel>
                                <Select 
                                    onValueChange={field.onChange} 
                                    value={field.value ?? ""} 
                                    disabled={isPatternDisabled}
                                >
                                    <FormControl>
                                        <SelectTrigger className={isPatternDisabled ? "bg-muted text-muted-foreground" : ""}>
                                            <SelectValue 
                                                placeholder={isPatternDisabled ? 
                                                    (selectedBox?.pattern_id ? 
                                                        (patterns.length > 0 ? patterns.find(p => p.id === selectedBox.pattern_id)?.name || "設定済み" : "設定済み")
                                                        : "未設定") 
                                                    : "パターンを選択 (任意)"
                                                } 
                                            />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {patterns.length > 0 ? (
                                            patterns.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                                        ) : (
                                            <div className="p-2 text-sm text-muted-foreground text-center">
                                                復習パターンがありません
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter className="justify-between">
                            <div>
                                <Button type="button" variant="secondary" onClick={() => finishMutation.mutate()} disabled={finishMutation.isPending}>
                                    {finishMutation.isPending ? '処理中...' : '途中完了にする'}
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={onClose}>閉じる</Button>
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