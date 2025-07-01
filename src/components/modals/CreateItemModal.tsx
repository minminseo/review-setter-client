import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// API関数
import { createItem } from '@/api/itemApi';
import { fetchCategories } from '@/api/categoryApi';
import { fetchBoxes } from '@/api/boxApi';
import { fetchPatterns } from '@/api/patternApi';

// Zustandストアから、データを読み取るためのセレクターと、データを書き込むためのアクションの両方を取得
import { useCategoryStore } from '@/store/categoryStore';
import { useBoxStore } from '@/store/boxStore';
import { usePatternStore } from '@/store/patternStore';
import { useItemStore } from '@/store/itemStore';

// 型定義とユーティリティ
import { cn } from '@/lib/utils';
import { CreateItemRequest } from '@/types';

// 定数
import { UNCLASSIFIED_ID } from '@/constants';

// UIコンポーネント
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { SelectPatternModal } from './SelectPatternModal';

const createItemSchema = (t: (key: string) => string) => z.object({
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

type CreateItemModalProps = {
    isOpen: boolean;
    onClose: () => void;
    defaultCategoryId?: string;
    defaultBoxId?: string;
};

export const CreateItemModal = ({ isOpen, onClose, defaultCategoryId, defaultBoxId }: CreateItemModalProps) => {
    const { t } = useTranslation();
    const itemSchema = createItemSchema(t);
    const queryClient = useQueryClient();
    const form = useForm<z.infer<typeof itemSchema>>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            name: '',
            detail: '',
            learned_date: new Date(),
            category_id: (defaultCategoryId && defaultCategoryId !== UNCLASSIFIED_ID) ? defaultCategoryId : 'UNCLASSIFIED',
            box_id: (defaultBoxId && defaultBoxId !== UNCLASSIFIED_ID) ? defaultBoxId : 'UNCLASSIFIED',
            pattern_id: null,
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
        mutationFn: (data: CreateItemRequest) => {
            return createItem(data);
        },

        onSuccess: (createdItem, variables) => {
            toast.success(t('notification.itemCreated'));
            // --- invalidate & zustand即時反映 ---
            // 通常ボックス
            if (variables.box_id && variables.box_id !== 'UNCLASSIFIED' && variables.box_id !== null) {
                queryClient.invalidateQueries({ queryKey: ['items', variables.box_id] });
            }
            // 完全未分類（category_id, box_idともに未分類）
            else if (
                (!variables.category_id || variables.category_id === 'UNCLASSIFIED' || variables.category_id === null) &&
                (!variables.box_id || variables.box_id === 'UNCLASSIFIED' || variables.box_id === null)
            ) {
                queryClient.invalidateQueries({ queryKey: ['items', 'unclassified', 'UNCLASSIFIED'] });
                queryClient.invalidateQueries({ queryKey: ['items', 'unclassified'] });
                // zustand即時反映
                if (useItemStore.getState().addItemToBox) {
                    useItemStore.getState().addItemToBox('unclassified', createdItem);
                }
            }
            // カテゴリー未分類以外＋ボックス未分類
            else if (variables.category_id && variables.category_id !== 'UNCLASSIFIED' && (!variables.box_id || variables.box_id === 'UNCLASSIFIED' || variables.box_id === null)) {
                queryClient.invalidateQueries({ queryKey: ['items', 'unclassified', variables.category_id] });
                // zustand即時反映
                if (useItemStore.getState().addItemToBox) {
                    useItemStore.getState().addItemToBox(`unclassified-${variables.category_id}`, createdItem);
                }
            }
            queryClient.invalidateQueries({ queryKey: ['todaysReviews'] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
            onClose();
        },
        onError: (err) => {
            toast.error(`${t('notification.creationFailed')}: ${err.message}`);
        },
    });

    // フォーム送信時の処理
    const onSubmit = (values: z.infer<typeof itemSchema>) => {
        // pattern_idがnullまたは空の場合は、リクエストボディから除外
        const processedPatternId = (!values.pattern_id || values.pattern_id === '') ? undefined : values.pattern_id;

        const data: CreateItemRequest = {
            // UNCLASSIFIEDをnullに変換（未分類として正しく送信）
            category_id: values.category_id === 'UNCLASSIFIED' ? null : values.category_id,
            box_id: values.box_id === 'UNCLASSIFIED' ? null : values.box_id,
            name: values.name,
            detail: values.detail,
            // Dateオブジェクトを "YYYY-MM-DD" 形式の文字列に変換
            learned_date: format(values.learned_date, "yyyy-MM-dd"),
            today: format(new Date(), "yyyy-MM-dd"),
            // 過去の復習日を完了扱いにするかどうかのフラグ
            is_mark_overdue_as_completed: true,
            // pattern_idが有効な場合のみ含める
            ...(processedPatternId && { pattern_id: processedPatternId }),
        };
        mutation.mutate(data);
    };

    // モーダルが開かれた時にフォームの初期値を設定し、閉じられた時にリセットする
    React.useEffect(() => {
        if (isOpen) {
            // モーダルが開かれた時は最新のdefaultCategoryId/defaultBoxIdを使用
            form.reset({
                name: '',
                detail: '',
                learned_date: new Date(),
                category_id: (defaultCategoryId && defaultCategoryId !== UNCLASSIFIED_ID) ? defaultCategoryId : 'UNCLASSIFIED',
                box_id: (defaultBoxId && defaultBoxId !== UNCLASSIFIED_ID) ? defaultBoxId : 'UNCLASSIFIED',
                pattern_id: null,
            });
        } else {
            // モーダルが閉じられた時は基本的なリセット
            form.reset({
                name: '',
                detail: '',
                learned_date: new Date(),
                category_id: 'UNCLASSIFIED',
                box_id: 'UNCLASSIFIED',
                pattern_id: null,
            });
        }
    }, [isOpen, form, defaultCategoryId, defaultBoxId]);

    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
    // 復習パターン選択モーダルの開閉状態
    const [isPatternModalOpen, setPatternModalOpen] = React.useState(false);
    // 選択中のパターン名（UI表示用）
    const [selectedPatternName, setSelectedPatternName] = React.useState('');

    // 初期値設定
    React.useEffect(() => {
        if (!selectedPatternName) {
            setSelectedPatternName(t('common.notSelected'));
        }
    }, [t, selectedPatternName]);

    // pattern_idのwatch
    const watchedPatternId = form.watch('pattern_id');

    // pattern_idが変わったらパターン名を更新
    React.useEffect(() => {
        if (watchedPatternId && patterns.length > 0) {
            const p = patterns.find(p => p.id === watchedPatternId);
            setSelectedPatternName(p?.name || t('common.notSelected'));
        } else {
            setSelectedPatternName(t('common.notSelected'));
        }
    }, [watchedPatternId, patterns, t]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg h-[700px] max-h-[95vh] flex flex-col">
                <div className="h-full flex flex-col overflow-hidden">
                    <div className="flex-1 flex flex-col overflow-hidden p-0">
                        <DialogHeader>
                            <div className="pb-2">
                                <DialogTitle>{t('item.createItem')}</DialogTitle>
                            </div>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
                                <ScrollArea className="flex-1 border-t min-h-0 max-h-[calc(100vh-200px)]">
                                    <div className="space-y-4 py-4">
                                        <FormField name="name" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('item.name')}</FormLabel>
                                                <div className="w-full">
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
                                                <div className="w-full">
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
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('category.name')}</FormLabel>
                                                <div className="w-full">
                                                    <Select onValueChange={(value) => {
                                                        field.onChange(value);
                                                        // カテゴリー変更時はボックスを未分類に設定
                                                        form.setValue('box_id', 'UNCLASSIFIED');
                                                    }} value={field.value ?? "UNCLASSIFIED"} disabled={categoriesLoading}>
                                                        <FormControl>
                                                            <SelectTrigger className="w-full min-w-0 max-w-[450px]">
                                                                <SelectValue placeholder={categoriesLoading ? t('loading.loading') : t('category.selectCategoryOptional')} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="w-full min-w-0 max-w-[450px]">
                                                            <SelectItem value="UNCLASSIFIED">
                                                                {t('common.unclassified')}
                                                            </SelectItem>
                                                            {categories.map(c => (
                                                                <SelectItem key={c.id} value={c.id}>
                                                                    {c.name}
                                                                </SelectItem>
                                                            ))}
                                                            {categoriesLoading && (
                                                                <div className="p-2 text-sm text-muted-foreground text-center">
                                                                    {t('loading.loading')}
                                                                </div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="box_id" control={form.control} render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('box.name')}</FormLabel>
                                                <div className="w-full">
                                                    <Select
                                                        onValueChange={(value) => field.onChange(value)}
                                                        value={field.value ?? "UNCLASSIFIED"}
                                                        disabled={boxesLoading}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger className="w-full min-w-0 max-w-[450px]">
                                                                <SelectValue placeholder={boxesLoading ? t('loading.loading') : t('box.selectBoxOptional')} />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent className="w-full min-w-0 max-w-[450px]">
                                                            <SelectItem value="UNCLASSIFIED">
                                                                {t('common.unclassified')}
                                                            </SelectItem>
                                                            {boxes.map(b => (
                                                                <SelectItem key={b.id} value={b.id}>
                                                                    {b.name}
                                                                </SelectItem>
                                                            ))}
                                                            {boxesLoading && (
                                                                <div className="p-2 text-sm text-muted-foreground text-center">
                                                                    {t('loading.loading')}
                                                                </div>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField name="pattern_id" control={form.control} render={({ }) => (
                                            <FormItem>
                                                <FormLabel className="inline-block pointer-events-none select-none">{t('pattern.reviewPattern')}{isPatternDisabled && ` (${t('pattern.useBoxSetting')})`}</FormLabel>
                                                <div className="w-full">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className={cn("w-full justify-start font-normal", isPatternDisabled ? "bg-muted text-muted-foreground" : "")}
                                                        onClick={() => !isPatternDisabled && setPatternModalOpen(true)}
                                                        disabled={isPatternDisabled}
                                                    >
                                                        {isPatternDisabled
                                                            ? (selectedBox?.pattern_id
                                                                ? (patterns.length > 0 ? patterns.find(p => p.id === selectedBox.pattern_id)?.name || t('pattern.configured') : t('pattern.configured'))
                                                                : t('pattern.notConfigured'))
                                                            : selectedPatternName}
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                                <SelectPatternModal
                                                    isOpen={isPatternModalOpen}
                                                    onClose={() => setPatternModalOpen(false)}
                                                    onSelect={(pattern) => {
                                                        form.setValue('pattern_id', pattern.id);
                                                        setPatternModalOpen(false);
                                                    }}
                                                />
                                            </FormItem>
                                        )} />

                                    </div>
                                    <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                                </ScrollArea>
                                <div className=" bottom-0">
                                    <DialogFooter className="justify-end">
                                        <div className="flex gap-3 absolute right-3 bottom-3 ">
                                            <Button type="button" variant="outline" onClick={onClose}>{t('common.close')}</Button>
                                            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? t('loading.creating') : t('common.create')}</Button>
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