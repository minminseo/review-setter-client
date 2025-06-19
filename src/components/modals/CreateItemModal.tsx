import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

// API関数
import { createItem } from '@/api/itemApi';
import { fetchCategories } from '@/api/categoryApi';
import { fetchBoxes } from '@/api/boxApi';
import { fetchPatterns } from '@/api/patternApi';

// Zustandストアから、データを読み取るためのセレクターと、データを書き込むためのアクションの両方を取得
import { useCategoryStore } from '@/store/categoryStore';
import { useBoxStore } from '@/store/boxStore';
import { usePatternStore } from '@/store/patternStore';

// 型定義とユーティリティ
import { cn } from '@/lib/utils';
import { CreateItemRequest } from '@/types';

// 定数
import { UNCLASSIFIED_ID } from '@/constants';

// UIコンポーネント
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const itemSchema = z.object({
    name: z.string().min(1, "復習物名は必須です。"),
    detail: z.string().optional(),
    learned_date: z.date({ required_error: "学習日は必須です。" }),
    category_id: z.union([
        z.string().uuid("正しいカテゴリーを選択してください。"),
        z.literal("UNCLASSIFIED")
    ]).nullable().optional(),
    box_id: z.union([
        z.string().uuid("正しいボックスを選択してください。"),
        z.literal("UNCLASSIFIED")
    ]).nullable().optional(),
    pattern_id: z.string().uuid("正しいパターンを選択してください。").nullable().optional(),
});

type CreateItemModalProps = {
    isOpen: boolean;
    onClose: () => void;
    defaultCategoryId?: string;
    defaultBoxId?: string;
};

export const CreateItemModal = ({ isOpen, onClose, defaultCategoryId, defaultBoxId }: CreateItemModalProps) => {
    const queryClient = useQueryClient();
    const form = useForm<z.infer<typeof itemSchema>>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            name: '',
            detail: '',
            learned_date: new Date(),
            category_id: (defaultCategoryId && defaultCategoryId !== UNCLASSIFIED_ID) ? defaultCategoryId : 'UNCLASSIFIED',
            box_id: (defaultBoxId && defaultBoxId !== UNCLASSIFIED_ID) ? defaultBoxId : 'UNCLASSIFIED',
        },
    });

    const watchedCategoryId = form.watch('category_id');
    const watchedBoxId = form.watch('box_id');

    // --- Zustandストアとの連携 ---
    // データを表示するために、各ストアから状態を読み取る
    const { categories, setCategories } = useCategoryStore();
    const { boxesByCategoryId, setBoxesForCategory } = useBoxStore();
    const { patterns, setPatterns } = usePatternStore();

    // watchedCategoryIdに紐づくボックスリストをストアから取得
    // 未分類選択（UNCLASSIFIED）の場合は空配列を返す（未分類ボックスはAPI経由で別途管理）
    const boxes = (watchedCategoryId && watchedCategoryId !== 'UNCLASSIFIED') ? (boxesByCategoryId[watchedCategoryId] || []) : [];
    
    // 選択されたボックスの情報を取得
    const selectedBox = watchedBoxId ? boxes.find(box => box.id === watchedBoxId) : null;
    
    // ボックスが選択されている場合は復習パターン選択を無効化
    const isPatternDisabled = !!selectedBox;

    // --- データ取得とストアへの同期 ---
    // 1. カテゴリー取得
    const { data: fetchedCategories, isSuccess: categoriesSuccess, isLoading: categoriesLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: fetchCategories,
        staleTime: 1000 * 60 * 5,
    });
    React.useEffect(() => {
        if (categoriesSuccess && fetchedCategories) {
            setCategories(fetchedCategories);
        }
    }, [categoriesSuccess, fetchedCategories, setCategories]);

    // 2. ボックス取得（カテゴリー依存）
    const { data: fetchedBoxes, isSuccess: boxesSuccess, isLoading: boxesLoading } = useQuery({
        queryKey: ['boxes', watchedCategoryId],
        queryFn: () => fetchBoxes(watchedCategoryId!),
        enabled: !!watchedCategoryId && watchedCategoryId !== 'UNCLASSIFIED',
    });
    React.useEffect(() => {
        if (boxesSuccess && watchedCategoryId && fetchedBoxes) {
            setBoxesForCategory(watchedCategoryId, fetchedBoxes);
        }
    }, [boxesSuccess, fetchedBoxes, watchedCategoryId, setBoxesForCategory]);

    // 3. パターン取得
    const { data: fetchedPatterns, isSuccess: patternsSuccess } = useQuery({
        queryKey: ['patterns'],
        queryFn: fetchPatterns,
        staleTime: 1000 * 60 * 5,
    });
    React.useEffect(() => {
        if (patternsSuccess && fetchedPatterns) {
            setPatterns(fetchedPatterns);
        }
    }, [patternsSuccess, fetchedPatterns, setPatterns]);

    // ボックス選択時に自動で復習パターンを設定する
    React.useEffect(() => {
        if (selectedBox && selectedBox.pattern_id) {
            form.setValue('pattern_id', selectedBox.pattern_id);
        } else if (!selectedBox) {
            // ボックスが選択解除された場合は復習パターンをクリア
            form.setValue('pattern_id', null);
        }
    }, [selectedBox, form]);

    // アイテム作成APIを呼び出すためのmutation
    const mutation = useMutation({
        mutationFn: (data: CreateItemRequest) => createItem(data),

        onSuccess: (_, variables) => {
            toast.success("アイテムを作成しました！");
            // 関連する全てのクエリを無効化し、UIを最新の状態に保つ
            queryClient.invalidateQueries({ queryKey: ['items', variables.box_id] });
            queryClient.invalidateQueries({ queryKey: ['todaysReviews'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] }); // サマリーデータも更新
            onClose();
        },
        onError: (err) => toast.error(`作成に失敗しました: ${err.message}`),
    });

    // フォーム送信時の処理
    const onSubmit = (values: z.infer<typeof itemSchema>) => {
        const data: CreateItemRequest = {
            ...values,
            // UNCLASSIFIEDをnullに変換（未分類として正しく送信）
            category_id: values.category_id === 'UNCLASSIFIED' ? null : values.category_id,
            box_id: values.box_id === 'UNCLASSIFIED' ? null : values.box_id,
            // Dateオブジェクトを "YYYY-MM-DD" 形式の文字列に変換
            learned_date: format(values.learned_date, "yyyy-MM-dd"),
            today: format(new Date(), "yyyy-MM-dd"),
            // 過去の復習日を完了扱いにするかどうかのフラグ
            is_mark_overdue_as_completed: true,
        };
        mutation.mutate(data);
    };

    // モーダルが閉じられた時にフォームをリセットする
    React.useEffect(() => {
        if (!isOpen) {
            form.reset({
                name: '',
                detail: '',
                learned_date: new Date(),
                category_id: (defaultCategoryId && defaultCategoryId !== UNCLASSIFIED_ID) ? defaultCategoryId : 'UNCLASSIFIED',
                box_id: (defaultBoxId && defaultBoxId !== UNCLASSIFIED_ID) ? defaultBoxId : 'UNCLASSIFIED',
            });
        }
    }, [isOpen, form, defaultCategoryId, defaultBoxId]);

    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false); //


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>復習物作成モーダル</DialogTitle>
                    <DialogDescription>新しい復習アイテムの情報を入力してください。</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                        <FormField name="name" control={form.control} render={({ field }) => (<FormItem><FormLabel>復習物名</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="detail" control={form.control} render={({ field }) => (<FormItem><FormLabel>詳細 (任意)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField name="learned_date" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>学習日</FormLabel>
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}> {/* openとonOpenChangeを追加 */}
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP") : <span>日付を選択</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={(date) => {
                                                field.onChange(date);
                                                setIsCalendarOpen(false); // 日付選択後、カレンダーを閉じる
                                            }}
                                            disabled={(date) => date > new Date()}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover><FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="category_id" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>カテゴリー</FormLabel>
                                <Select onValueChange={(value) => { field.onChange(value); form.resetField('box_id'); }} value={field.value ?? "UNCLASSIFIED"} disabled={categoriesLoading}>
                                    <FormControl><SelectTrigger><SelectValue placeholder={categoriesLoading ? "読み込み中..." : "カテゴリーを選択 (任意)"} /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="UNCLASSIFIED">未分類</SelectItem>
                                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        {categoriesLoading && (
                                            <div className="p-2 text-sm text-muted-foreground text-center">
                                                読み込み中...
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField name="box_id" control={form.control} render={({ field }) => (
                            <FormItem><FormLabel>ボックス</FormLabel>
                                <Select 
                                    onValueChange={(value) => field.onChange(value)} 
                                    value={field.value ?? "UNCLASSIFIED"} 
                                    disabled={boxesLoading}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                boxesLoading ? "読み込み中..." :
                                                "ボックスを選択 (任意)"
                                            } />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="UNCLASSIFIED">未分類</SelectItem>
                                        {boxes.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                        {boxesLoading && (
                                            <div className="p-2 text-sm text-muted-foreground text-center">
                                                読み込み中...
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select><FormMessage />
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

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>キャンセル</Button>
                            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? '作成中...' : '作成'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};