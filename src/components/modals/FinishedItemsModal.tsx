import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';

// API関数
import { fetchFinishedItemsByBox, fetchFinishedUnclassifiedItems, fetchFinishedUnclassifiedItemsByCategory, markItemAsUnfinished, incompleteReviewDate, fetchUnclassifiedItems, fetchUnclassifiedItemsByCategory, fetchItemsByBox } from '@/api/itemApi';
import { UNCLASSIFIED_ID } from '@/constants';
import { useItemStore } from '@/store';
import { cn } from '@/lib/utils';
// 型定義
import { ItemResponse } from '@/types';
// UIコンポーネント
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronDoubleLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import NameCell from '@/components/shared/NameCell';
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

    // --- State (復習物名列の幅調整) ---
    const [nameColumnWidth, setNameColumnWidth] = React.useState(300);
    const [isResizing, setIsResizing] = React.useState(false);
    const [isHovering, setIsHovering] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [startWidth, setStartWidth] = React.useState(0);

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
                queryClient.invalidateQueries({ queryKey: queryKey, exact: true }),
                queryClient.invalidateQueries({ queryKey: ['items', boxId], exact: true }),
                queryClient.invalidateQueries({ queryKey: ['todaysReviews'], exact: true }),
                queryClient.invalidateQueries({ queryKey: ['summary'], exact: true })
            ]);
            await queryClient.refetchQueries({ queryKey: queryKey, exact: true });
            // --- zustandストアも即時更新 ---
            const storeBoxId = getStoreBoxId(boxId, categoryId);
            let items: ItemResponse[] = [];
            if (
                (boxId === undefined && categoryId === undefined) ||
                (boxId === UNCLASSIFIED_ID && (!categoryId || categoryId === UNCLASSIFIED_ID)) ||
                (categoryId && categoryId !== UNCLASSIFIED_ID && (boxId === undefined || boxId === UNCLASSIFIED_ID))
            ) {
                if (categoryId === UNCLASSIFIED_ID && boxId === UNCLASSIFIED_ID) {
                    items = await fetchUnclassifiedItems();
                } else if (categoryId && categoryId !== UNCLASSIFIED_ID && boxId === UNCLASSIFIED_ID) {
                    items = await fetchUnclassifiedItemsByCategory(categoryId);
                }
            } else if (boxId && boxId !== UNCLASSIFIED_ID) {
                // 通常のボックスの場合
                items = await fetchItemsByBox(boxId);
            }
            if (storeBoxId) {
                setItemsForBox(storeBoxId, items.filter((item: ItemResponse) => !item.is_finished));
            }
        },
        onError: (err: any) => toast.error(`処理に失敗しました: ${err.message}`),
    });

    const incompleteReviewMutation = useMutation({
        mutationFn: ({ itemId, reviewDateId, stepNumber }: { itemId: string; reviewDateId: string; stepNumber: number }) =>
            incompleteReviewDate({ itemId, reviewDateId, data: { step_number: stepNumber } }),
        onSuccess: async () => {
            toast.success("復習を未完了に戻しました。");
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKey, exact: true }),
                queryClient.invalidateQueries({ queryKey: ['items', boxId], exact: true }),
                queryClient.invalidateQueries({ queryKey: ['todaysReviews'], exact: true })
            ]);
            await queryClient.refetchQueries({ queryKey: queryKey, exact: true });
            // --- zustandストアも即時更新 ---
            const storeBoxId = getStoreBoxId(boxId, categoryId);
            let items: ItemResponse[] = [];
            if (
                (boxId === undefined && categoryId === undefined) ||
                (boxId === UNCLASSIFIED_ID && (!categoryId || categoryId === UNCLASSIFIED_ID)) ||
                (categoryId && categoryId !== UNCLASSIFIED_ID && (boxId === undefined || boxId === UNCLASSIFIED_ID))
            ) {
                if (categoryId === UNCLASSIFIED_ID && boxId === UNCLASSIFIED_ID) {
                    items = await fetchUnclassifiedItems();
                } else if (categoryId && categoryId !== UNCLASSIFIED_ID && boxId === UNCLASSIFIED_ID) {
                    items = await fetchUnclassifiedItemsByCategory(categoryId);
                }
            } else if (boxId && boxId !== UNCLASSIFIED_ID) {
                // 通常のボックスの場合
                items = await fetchItemsByBox(boxId);
            }
            if (storeBoxId && items.length > 0) {
                setItemsForBox(storeBoxId, items.filter((item: ItemResponse) => !item.is_finished));
            }
        },
        onError: (err) => toast.error(`未完了に戻すのに失敗しました: ${err.message}`),
    });

    // --- リサイズ機能 ---
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        setStartX(e.clientX);
        setStartWidth(nameColumnWidth);
    };

    const handleResizeMove = React.useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const diff = e.clientX - startX;
        const newWidth = Math.max(100, startWidth + diff); // 最小100px、最大無制限
        setNameColumnWidth(newWidth);
    }, [isResizing, startX, startWidth]);

    const handleResizeEnd = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const handleResetWidth = () => {
        setNameColumnWidth(300); // 初期値にリセット
    };

    React.useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        } else {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing, handleResizeMove, handleResizeEnd]);

    // --- テーブル定義 ---
    // カラム数を動的に計算（実際に復習日がある場合のみカラムを表示）
    const maxColumns = React.useMemo(() => {
        const itemColumns = finishedItems.length > 0 ? Math.max(...finishedItems.map((i) => i.review_dates.length)) : 0;
        // 復習日が存在しない場合は0を返す
        return itemColumns;
    }, [finishedItems.length]);

    // テーブル全体の幅を動的に計算
    const baseWidth = 50 + nameColumnWidth + 50 + 100; // 操作+復習物名+詳細+学習日
    const reviewColumnWidth = maxColumns * 130;
    const tableWidth = baseWidth + reviewColumnWidth;

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
                const allReviewDatesCompleted = item.review_dates.every(rd => rd.is_completed);

                // 一つでも未完了の復習日があるかチェック
                const hasIncompleteReviewDate = item.review_dates.some(rd => !rd.is_completed);

                // 取消ボタンの表示条件：すべての復習日が完了 AND 最後の復習日が今日
                const showCancelButton = allReviewDatesCompleted && isLastReviewDateToday;

                // 再開ボタンの表示条件：一つでも未完了の復習日がある
                const showRestartButton = hasIncompleteReviewDate;

                return (
                    <div className='flex gap-2'>
                        {/* 取消ボタン：すべて完了済み かつ 最後の復習日が今日の場合のみ表示 */}
                        {showCancelButton && (
                            <Button
                                size="sm"
                                variant="outline"

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

                        {/* 再開ボタン：一つでも未完了の復習日がある場合のみ表示 */}
                        {showRestartButton && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-gray-400"
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
            header: () => (
                <div className="flex items-center justify-center relative">
                    <span className="block w-full text-center">復習物名</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 h-4 w-4 p-0 hover:bg-gray-200"
                        onClick={handleResetWidth}
                        title="幅を初期化"
                    >
                        <ChevronDoubleLeftIcon className="h-3 w-3" />
                    </Button>
                </div>
            ),
            size: nameColumnWidth,
            cell: ({ row }) => <NameCell name={row.original.name} />,
        },
        {
            id: 'detail',
            header: () => (
                <span className="block w-full text-center">詳細</span>
            ),
            size: 50,
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-gray-200 hover:text-gray-400 transition-colors"
                        onClick={() => setDetailItem(row.original)}
                    >
                        <DocumentTextIcon className="h-5 w-5" />
                    </Button>
                </div>
            ),
        },
        {
            accessorKey: 'learned_date',
            header: () => (
                <span className="block w-full text-center">学習日</span>
            ),
            size: 100,
            cell: ({ row }) => (
                <div className="flex justify-center">
                    {format(new Date(row.original.learned_date), 'yyyy-MM-dd')}
                </div>
            ),
        },
        ...Array.from({ length: maxColumns }).map((_, index) => ({
            id: `review_date_${index + 1}`,
            header: () => (
                <span className="block w-full text-center">{index + 1}回目</span>
            ),
            size: 130,
            cell: ({ row }: { row: { original: ItemResponse } }) => {
                const reviewDate = row.original.review_dates[index];
                if (!reviewDate) return <span className="text-muted-foreground">-</span>;
                const isToday = format(new Date(reviewDate.scheduled_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                    <div className="flex items-center justify-center">
                        <Button
                            variant={!reviewDate.is_completed && !isToday ? 'outline' : 'default'}
                            size="sm"
                            className={cn(
                                isToday && !reviewDate.is_completed && 'bg-blue-800 hover:bg-blue-900 text-gray-200',
                                isToday && reviewDate.is_completed && 'bg-blue-900 text-gray-400',
                                !isToday && reviewDate.is_completed && 'bg-green-700 text-white',
                                'cursor-not-allowed opacity-50'
                            )}
                            disabled
                        >
                            {format(new Date(reviewDate.scheduled_date), 'yyyy-MM-dd')}
                        </Button>
                    </div>
                );
            },
        })),
    ], [finishedItems, maxColumns, unfinishMutation, incompleteReviewMutation, nameColumnWidth, handleResetWidth]);


    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="w-screen !max-w-none h-[90vh] max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle>完了済み復習物一覧</DialogTitle>
                        <DialogDescription>完了済みのアイテムを確認し、必要に応じて復習を再開できます。</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 flex flex-col overflow-hidden py-4">
                        {/* --- スクロール可能なテーブル領域 --- */}
                        <Card className="flex-1 min-h-0 p-0 py-0">
                            <CardContent className="p-0 h-full">
                                <ScrollArea className="w-full h-full max-h-[calc(90vh-200px)] rounded-xl pb-6">
                                    {isLoading ? (
                                        <TableSkeleton />
                                    ) : (
                                        <DataTable
                                            columns={columns}
                                            data={finishedItems}
                                            enablePagination={false}
                                            maxHeight="100%"
                                            fixedColumns={5}
                                            tableWidth={tableWidth}
                                            resizableColumn={{
                                                index: 2, // 復習物名列（0: 状態, 1: 操作, 2: 復習物名）
                                                onResizeStart: handleResizeStart,
                                                isResizing: isResizing,
                                                isHovering: isHovering,
                                                onHover: setIsHovering
                                            }}
                                        />
                                    )}
                                    <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                                    <ScrollBar orientation="horizontal" className="!bg-transparent [&>div]:!bg-gray-600 !h-1.5" />
                                </ScrollArea>
                            </CardContent>
                        </Card>
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