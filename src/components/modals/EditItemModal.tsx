import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

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
    const { updateItemInBox, removeItemFromBox } = useItemStore();

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

    // データ取得: フォームの選択肢を生成するために必要
    const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories, staleTime: Infinity });
    const { data: boxes = [] } = useQuery({
        queryKey: ['boxes', watchedCategoryId],
        queryFn: () => fetchBoxes(watchedCategoryId!),
        enabled: !!watchedCategoryId,
    });
    const { data: patterns = [] } = useQuery({ queryKey: ['patterns'], queryFn: fetchPatterns, staleTime: Infinity });

    const updateMutation = useMutation({
        mutationFn: (data: UpdateItemRequest) => updateItem({ itemId: item.item_id, data }),
        onSuccess: (updatedItem) => {
            toast.success("アイテムを更新しました！");
            queryClient.invalidateQueries({ queryKey: ['items', item.box_id] });
            // box_idが存在する場合のみ、ストアを更新する
            if (item.box_id) {
                updateItemInBox(item.box_id, updatedItem);
            }
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
                            <FormItem><FormLabel>ボックス</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={!watchedCategoryId}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="ボックスを選択 (任意)" /></SelectTrigger></FormControl>
                                    <SelectContent>{boxes.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="pattern_id" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>復習パターン</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="パターンを選択 (任意)" /></SelectTrigger></FormControl>
                                    <SelectContent>{patterns.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
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