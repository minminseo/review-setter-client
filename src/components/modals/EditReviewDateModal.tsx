import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

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
    const { t } = useTranslation();
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
        onSuccess: (updatedItemData) => {
            toast.success(t('notification.reviewDateUpdated'));
            queryClient.invalidateQueries({ queryKey: ['items', data?.item.box_id] });
            queryClient.invalidateQueries({ queryKey: ['todaysReviews'] });
            if (data?.item.box_id) {
                updateItemInBox(data.item.box_id, updatedItemData);
            }
            onClose();
        },
        onError: (err: any) => toast.error(t('error.updateFailed', { message: err.message })),
    });

    // onSubmitハンドラのロジックは変更なし
    const onSubmit = (values: z.infer<ReturnType<typeof createFormSchema>>) => {
        if (!data) return;
        const currentPattern = patterns.find(p => p.id === data.item.pattern_id);
        if (!currentPattern) {
            toast.error(t('error.patternNotFound'));
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
                    <DialogTitle className=" border-b pb-2">{t('review.editReviewDateModalTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('review.editReviewDateModalDescription', { name: data.item.name })}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    {/* form以下のJSXは変更なし */}
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 mb-3">
                        <ScrollArea className="flex-1 border-t min-h-0 max-h-[calc(100vh-200px)]">
                            <div className="space-y-4 py-4">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">{t('review.currentReviewDate')}</p>
                                    <p className="font-semibold">{format(new Date(data.reviewDate.scheduled_date), "yyyy-MM-dd")}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {t('review.editableRange', { from: format(new Date(data.reviewDate.initial_scheduled_date), "yyyy-MM-dd") })}
                                    </p>
                                </div>

                                <FormField name="request_scheduled_date" control={form.control} render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="inline-block pointer-events-none select-none">{t('review.newReviewDate')}</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        {field.value ? format(field.value, "PPP") : <span>{t('review.selectDate')}</span>}
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
                                        <FormLabel className="inline-block pointer-events-none select-none">{t('review.overdueHandling')}</FormLabel>
                                        <Select onValueChange={(value) => field.onChange(value === 'true')} defaultValue={String(field.value)}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="true">{t('review.overdueComplete')}</SelectItem>
                                                <SelectItem value="false">{t('review.overdueToday')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {/* FormDescriptionを正しく使用 */}
                                        <FormDescription className="text-xs pt-2">
                                            <QuestionMarkCircleIcon className="inline h-4 w-4 mr-1" />
                                            {t('review.overdueDescription')}
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                        </ScrollArea>
                        <DialogFooter className="justify-end">
                            <div className="flex gap-3 absolute right-3 bottom-3">
                                <Button type="button" variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
                                <Button type="submit" disabled={mutation.isPending}>
                                    {mutation.isPending ? t('loading.saving') : t('common.save')}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};