import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { updateReviewDate } from '@/api/itemApi';
import { fetchPatterns } from '@/api/patternApi';
import { useItemStore, usePatternStore } from '@/store';
import { ItemResponse, ReviewDateResponse, UpdateReviewDatesRequest } from '@/types';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
// FormDescriptionを正しくインポート
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// フォームのバリデーションルール（動的に生成）
const createFormSchema = (initialScheduledDate: string) => z.object({
    request_scheduled_date: z.date({ required_error: "新しい復習日の選択は必須です。" })
        .refine((date) => {
            const today = new Date(new Date().setHours(0, 0, 0, 0));
            const initialDate = new Date(initialScheduledDate);
            return date < today && date >= initialDate;
        }, {
            message: "復習日は今日より前、かつ最初の復習予定日以降の日付である必要があります。"
        }),
    is_mark_overdue_as_completed: z.boolean(),
});

type EditReviewDateModalProps = {
    isOpen: boolean;
    onClose: () => void;
    data: { item: ItemResponse; reviewDate: ReviewDateResponse } | null;
};

/**
 * 特定の復習日のスケジュールを変更するためのモーダル。
 */
export const EditReviewDateModal = ({ isOpen, onClose, data }: EditReviewDateModalProps) => {
    const queryClient = useQueryClient();
    const { patterns } = usePatternStore();
    // useItemStoreからupdateItemInBoxアクションを取得
    const { updateItemInBox } = useItemStore();

    // 動的にバリデーションスキーマを生成
    const formSchema = React.useMemo(() => {
        if (!data) return createFormSchema(new Date().toISOString());
        return createFormSchema(data.reviewDate.initial_scheduled_date);
    }, [data]);

    const form = useForm<z.infer<ReturnType<typeof createFormSchema>>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            is_mark_overdue_as_completed: true,
        },
    });

    useQuery({ queryKey: ['patterns'], queryFn: fetchPatterns, staleTime: Infinity });

    const mutation = useMutation({
        mutationFn: (reqData: UpdateReviewDatesRequest) =>
            updateReviewDate({ itemId: data!.item.item_id, reviewDateId: data!.reviewDate.review_date_id, data: reqData }),
        onSuccess: (updatedItemData) => { // APIからのレスポンスを受け取る
            toast.success("復習日を更新しました。");

            // 関連するクエリのキャッシュを無効化
            queryClient.invalidateQueries({ queryKey: ['items', data?.item.box_id] });
            queryClient.invalidateQueries({ queryKey: ['todaysReviews'] });

            // useItemStoreを正しく使用して、ストアの状態を更新する
            if (data?.item.box_id) {
                updateItemInBox(data.item.box_id, updatedItemData);
            }

            onClose();
        },
        onError: (err: any) => toast.error(`更新に失敗しました: ${err.message}`),
    });

    // onSubmitハンドラのロジックは変更なし
    const onSubmit = (values: z.infer<ReturnType<typeof createFormSchema>>) => {
        if (!data) return;
        const currentPattern = patterns.find(p => p.id === data.item.pattern_id);
        if (!currentPattern) {
            toast.error("このアイテムの復習パターンが見つかりませんでした。");
            return;
        }

        const requestBody: UpdateReviewDatesRequest = {
            ...values,
            request_scheduled_date: format(values.request_scheduled_date, "yyyy-MM-dd"),
            today: format(new Date(), "yyyy-MM-dd"),
            pattern_steps: currentPattern.steps,
            learned_date: data.item.learned_date,
            initial_scheduled_date: data.reviewDate.initial_scheduled_date,
            step_number: data.reviewDate.step_number,
            category_id: data.item.category_id,
            box_id: data.item.box_id,
        };
        mutation.mutate(requestBody);
    };

    React.useEffect(() => {
        if (data) {
            form.reset({
                request_scheduled_date: new Date(data.reviewDate.scheduled_date),
                is_mark_overdue_as_completed: true,
            });
        }
    }, [data, form]);

    if (!data) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>復習日変更モーダル</DialogTitle>
                    <DialogDescription>
                        「{data.item.name}」の復習日を変更します。
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    {/* form以下のJSXは変更なし */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">現在の復習日</p>
                            <p className="font-semibold">{format(new Date(data.reviewDate.scheduled_date), "yyyy-MM-dd")}</p>
                            <p className="text-xs text-muted-foreground">
                                変更可能範囲: {format(new Date(data.reviewDate.initial_scheduled_date), "yyyy-MM-dd")} ～ 昨日まで
                            </p>
                        </div>

                        <FormField name="request_scheduled_date" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>新しい復習日</FormLabel>
                                <Popover>
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
                                            onSelect={field.onChange} 
                                            disabled={(date) => {
                                                const today = new Date(new Date().setHours(0, 0, 0, 0));
                                                const initialDate = new Date(data.reviewDate.initial_scheduled_date);
                                                // 今日以降、またはinitial_scheduled_dateより前の日付は無効
                                                return date >= today || date < initialDate;
                                            }}
                                            initialFocus 
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField name="is_mark_overdue_as_completed" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>後続の復習日の扱い</FormLabel>
                                <Select onValueChange={(value) => field.onChange(value === 'true')} defaultValue={String(field.value)}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="true">過ぎた日付は完了扱いにし、スケジュールを詰める</SelectItem>
                                        <SelectItem value="false">過ぎた日付は今日に設定し、スケジュールを維持する</SelectItem>
                                    </SelectContent>
                                </Select>
                                {/* FormDescriptionを正しく使用 */}
                                <FormDescription className="text-xs">
                                    変更後の日付によっては、後続の復習日が今日より前になる場合があります。その場合の振る舞いを指定します。
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>キャンセル</Button>
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? '保存中...' : '保存'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};