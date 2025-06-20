import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';

// API関数
import { fetchFinishedItemsByBox, fetchFinishedUnclassifiedItems, fetchFinishedUnclassifiedItemsByCategory, markItemAsUnfinished, incompleteReviewDate } from '@/api/itemApi';
import { UNCLASSIFIED_ID } from '@/constants';
import { useItemStore } from '@/store';
import { fetchUnclassifiedItems, fetchUnclassifiedItemsByCategory } from '@/api/itemApi';
// 型定義
import { ItemResponse } from '@/types';
// UIコンポーネント
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
// 詳細表示用にItemDetailModalをインポート
import { ItemDetailModal } from './ItemDetailModal';

type FinishedItemsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    boxId?: string;
    categoryId?: string;
};

// storeBoxId生成ロジックをBoxAndCategoryPageと統一
const getStoreBoxId = (boxId: string | undefined, categoryId: string | undefined) => {
    if ((boxId === UNCLASSIFIED_ID || !boxId) && categoryId && categoryId !== UNCLASSIFIED_ID) {
        return `unclassified-${categoryId}`;
    } else if (!boxId || boxId === UNCLASSIFIED_ID) {
        return 'unclassified';
    }
    return boxId;
};

export const FinishedItemsModal = ({ isOpen, onClose, boxId, categoryId }: FinishedItemsModalProps) => {
    const queryClient = useQueryClient();
    const setItemsForBox = useItemStore(state => state.setItemsForBox);
    // 詳細表示モーダルで表示するアイテムを管理するstate
    const [detailItem, setDetailItem] = React.useState<ItemResponse | null>(null);

    const queryKey = ['finishedItems', { boxId, categoryId }];
    const queryFn = () => {
        if (boxId) {
            // 未分類ボックスの場合は異なるAPIを使用
            if (boxId === UNCLASSIFIED_ID) {
                if (categoryId === UNCLASSIFIED_ID) {
                    // ホーム画面からの真の未分類（category_id、box_id両方NULL）
                    return fetchFinishedUnclassifiedItems();
                } else {
                    // カテゴリー内の未分類（category_id設定、box_id NULL）
                    return fetchFinishedUnclassifiedItemsByCategory(categoryId!);
                }
            }
            // 通常のボックス
            return fetchFinishedItemsByBox(boxId);
        }
        return Promise.resolve([]);
    };

    const { data: finishedItems = [], isLoading } = useQuery({
        queryKey: queryKey,
        queryFn: queryFn,
        enabled: isOpen,
    });

    const unfinishMutation = useMutation({
        mutationFn: (item: ItemResponse) => {
            const unfinishData = {
                itemId: item.item_id,
                data: {
                    pattern_id: item.pattern_id!,
                    learned_date: item.learned_date,
                    today: format(new Date(), 'yyyy-MM-dd'),
                },
            };
            return markItemAsUnfinished(unfinishData);
        },
        onSuccess: async () => {
            toast.success(`復習を再開しました。`);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKey }),
                queryClient.invalidateQueries({ queryKey: ['items', boxId] }),
                queryClient.invalidateQueries({ queryKey: ['todaysReviews'] }),
                queryClient.invalidateQueries({ queryKey: ['summary'] })
            ]);
            // --- zustandストアも即時更新 ---
            if (
                (boxId === undefined && categoryId === undefined) ||
                (boxId === UNCLASSIFIED_ID && (!categoryId || categoryId === UNCLASSIFIED_ID)) ||
                (categoryId && categoryId !== UNCLASSIFIED_ID && (boxId === undefined || boxId === UNCLASSIFIED_ID))
            ) {
                const storeBoxId = getStoreBoxId(boxId, categoryId);
                let items: ItemResponse[] = [];
                if (categoryId === UNCLASSIFIED_ID && boxId === UNCLASSIFIED_ID) {
                    items = await fetchUnclassifiedItems();
                } else if (categoryId && categoryId !== UNCLASSIFIED_ID && boxId === UNCLASSIFIED_ID) {
                    items = await fetchUnclassifiedItemsByCategory(categoryId);
                }
                setItemsForBox(storeBoxId || '', items.filter((item: ItemResponse) => !item.is_finished));
            }
        },
        onError: (err: any) => toast.error(`処理に失敗しました: ${err.message}`),
    });

    const incompleteReviewMutation = useMutation({
        mutationFn: ({ itemId, reviewDateId, stepNumber }: { itemId: string; reviewDateId: string; stepNumber: number }) =>
            incompleteReviewDate({ itemId, reviewDateId, data: { step_number: stepNumber } }),
        onSuccess: async () => {
            toast.success("復習を未完了に戻しました。");
            queryClient.invalidateQueries({ queryKey: queryKey });
            queryClient.invalidateQueries({ queryKey: ['items', boxId] });
            queryClient.invalidateQueries({ queryKey: ['todaysReviews'] });
            // --- zustandストアも即時更新 ---
            if (
                (boxId === undefined && categoryId === undefined) ||
                (boxId === UNCLASSIFIED_ID && (!categoryId || categoryId === UNCLASSIFIED_ID)) ||
                (categoryId && categoryId !== UNCLASSIFIED_ID && (boxId === undefined || boxId === UNCLASSIFIED_ID))
            ) {
                const storeBoxId = getStoreBoxId(boxId, categoryId);
                let items: ItemResponse[] = [];
                if (categoryId === UNCLASSIFIED_ID && boxId === UNCLASSIFIED_ID) {
                    items = await fetchUnclassifiedItems();
                } else if (categoryId && categoryId !== UNCLASSIFIED_ID && boxId === UNCLASSIFIED_ID) {
                    items = await fetchUnclassifiedItemsByCategory(categoryId);
                }
                setItemsForBox(storeBoxId || '', items.filter((item: ItemResponse) => !item.is_finished));
            }
        },
        onError: (err) => toast.error(`未完了に戻すのに失敗しました: ${err.message}`),
    });

    const columns = React.useMemo<ColumnDef<ItemResponse>[]>(() => [
        {
            id: 'actions',
            header: '操作',
            cell: ({ row }) => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const item = row.original;

                // 最後の復習日を取得
                const lastReviewDate = item.review_dates[item.review_dates.length - 1];
                const isLastReviewDateToday = lastReviewDate &&
                    format(new Date(lastReviewDate.scheduled_date), 'yyyy-MM-dd') === today;

                // すべての復習日が完了しているかチェック
                const hasIncompleteReviewDate = item.review_dates.some(rd => !rd.is_completed);

                return (
                    <div className='flex gap-2'>
                        {/* 最後の復習日が今日の場合は「取消」ボタンを表示 */}
                        {isLastReviewDateToday && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-gray-600 border-gray-400"
                                onClick={() => incompleteReviewMutation.mutate({
                                    itemId: item.item_id,
                                    reviewDateId: lastReviewDate.review_date_id,
                                    stepNumber: lastReviewDate.step_number
                                })}
                                disabled={incompleteReviewMutation.isPending}
                            >
                                取消
                            </Button>
                        )}

                        {/* 未完了の復習日がある場合は「再開」ボタンを表示 */}
                        {hasIncompleteReviewDate && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => unfinishMutation.mutate(item)}
                                disabled={unfinishMutation.isPending}
                            >
                                再開
                            </Button>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'name',
            header: '復習物名',
        },
        {
            id: 'detail',
            header: '詳細',
            cell: ({ row }) => (
                <Button variant="ghost" size="icon" onClick={() => setDetailItem(row.original)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                </Button>
            )
        },
        {
            accessorKey: 'learned_date',
            header: '学習日',
            cell: ({ row }) => format(new Date(row.original.learned_date), 'yyyy-MM-dd'),
        },
    ], [unfinishMutation, incompleteReviewMutation]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>完了済み復習物一覧</DialogTitle>
                        <DialogDescription>完了済みのアイテムを確認し、必要に応じて復習を再開できます。</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoading ? <TableSkeleton /> : <DataTable columns={columns} data={finishedItems} />}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>閉じる</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* ItemDetailModalを正しくレンダリングする */}
            <ItemDetailModal isOpen={!!detailItem} onClose={() => setDetailItem(null)} item={detailItem} />
        </>
    );
};