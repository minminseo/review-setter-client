import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';

// API & Store
import { deleteItem, completeReviewDate, incompleteReviewDate } from '@/api/itemApi';
import { useItemStore, usePatternStore } from '@/store';
import { useModal } from '@/contexts/ModalContext';
import { ItemResponse, ReviewDateResponse, GetCategoryOutput, GetBoxOutput } from '@/types';
import { cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CogIcon, InformationCircleIcon, PencilIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import NameCell from '@/components/shared/NameCell';

// Modals
import { ItemDetailModal } from '@/components/modals/ItemDetailModal';
import { EditItemModal } from '@/components/modals/EditItemModal';
import { EditReviewDateModal } from '@/components/modals/EditReviewDateModal';
import { BoxSummaryModal } from '@/components/modals/BoxSummaryModal';
import { EditBoxModal } from '@/components/modals/EditBoxModal';
import { FinishedItemsModal } from '@/components/modals/FinishedItemsModal';

// Boxコンポーネントが受け取るPropsの型定義
interface BoxProps {
    items: ItemResponse[];
    isLoading: boolean;
    currentCategory: GetCategoryOutput | undefined;
    currentBox: GetBoxOutput | null | undefined;
}

/**
 * ボックス詳細ページのメインコンテンツ。
 * アイテムの一覧テーブルと、関連する操作を担当する。
 * @param props - 親コンポーネント(BoxAndCategoryPage)から渡されるデータと状態
 */
export const Box = ({ items, isLoading, currentCategory, currentBox }: BoxProps) => {
    // --- Hooks ---
    const { categoryId, boxId } = useParams<{ categoryId: string; boxId: string }>();
    const queryClient = useQueryClient();
    const { openCreateItemModal } = useModal();

    // --- Zustandストア ---
    const { getItemsForBox, removeItemFromBox } = useItemStore();
    const { patterns } = usePatternStore();

    // --- State (モーダル管理) ---
    const [detailItem, setDetailItem] = React.useState<ItemResponse | null>(null);
    const [editingItem, setEditingItem] = React.useState<ItemResponse | null>(null);
    const [deletingItem, setDeletingItem] = React.useState<ItemResponse | null>(null);
    const [editingDate, setEditingDate] = React.useState<{ item: ItemResponse; reviewDate: ReviewDateResponse } | null>(null);
    const [isSummaryModalOpen, setSummaryModalOpen] = React.useState(false);
    const [isEditBoxModalOpen, setEditBoxModalOpen] = React.useState(false);
    const [isFinishedItemsModalOpen, setFinishedItemsModalOpen] = React.useState(false);

    // --- Mutations ---
    const deleteMutation = useMutation({
        mutationFn: (itemId: string) => deleteItem(itemId),
        onSuccess: (_, itemId) => {
            toast.success('アイテムを削除しました。');
            if (boxId) removeItemFromBox(boxId, itemId);
            queryClient.invalidateQueries({ queryKey: ['items', boxId, categoryId] });
        },
        onError: (err: any) => toast.error(`削除に失敗しました: ${err.message}`),
        onSettled: () => setDeletingItem(null),
    });

    const completeReviewMutation = useMutation({
        mutationFn: ({ itemId, reviewDateId, stepNumber }: { itemId: string; reviewDateId: string; stepNumber: number; }) => completeReviewDate({ itemId, reviewDateId, data: { step_number: stepNumber } }),
        onSuccess: (_, variables) => {
            toast.success('復習を完了しました。');
            queryClient.invalidateQueries({ queryKey: ['items', boxId, categoryId] });
            // --- zustandストアからも即時削除 ---
            if (storeBoxId) removeItemFromBox(storeBoxId, variables.itemId);
        },
        onError: (err: any) => toast.error(`完了に失敗しました: ${err.message}`),
    });

    const incompleteReviewMutation = useMutation({
        mutationFn: ({ itemId, reviewDateId, stepNumber }: { itemId: string; reviewDateId: string; stepNumber: number; }) => incompleteReviewDate({ itemId, reviewDateId, data: { step_number: stepNumber } }),
        onSuccess: () => {
            toast.success('復習を未完了に戻しました。');
            queryClient.invalidateQueries({ queryKey: ['items', boxId, categoryId] });
        },
        onError: (err: any) => toast.error(`未完了に戻すのに失敗しました: ${err.message}`),
    });

    // --- アイテムリストの取得ロジック ---
    let storeBoxId = boxId;
    if ((boxId === 'unclassified' || !boxId) && categoryId && categoryId !== 'unclassified') {
        storeBoxId = `unclassified-${categoryId}`;
    } else if (!boxId) {
        storeBoxId = 'unclassified';
    }
    const zustandItems = getItemsForBox(storeBoxId || '');

    // デバッグ用ログ
    React.useEffect(() => {
        // どのキーでzustandから取得しているか
        console.log('[Box] storeBoxId:', storeBoxId);
        // zustandストアの中身
        console.log('[Box] zustandItems:', zustandItems);
        // propsで渡されたitems
        console.log('[Box] props.items:', items);
        // categoryId, boxId
        console.log('[Box] categoryId:', categoryId, 'boxId:', boxId);
    }, [storeBoxId, zustandItems, items, categoryId, boxId]);

    // --- スケルトン表示制御 ---
    const showSkeleton = isLoading && (!zustandItems || zustandItems.length === 0);
    const displayItems = zustandItems && zustandItems.length > 0 ? zustandItems : items;

    // デバッグ用：displayItemsのreview_datesをチェック
    React.useEffect(() => {
        if (displayItems && displayItems.length > 0) {
            console.log('=== Box displayItems Debug ===');
            console.log('displayItems source:', zustandItems && zustandItems.length > 0 ? 'zustand' : 'props');
            console.log('displayItems count:', displayItems.length);
            displayItems.forEach((item, index) => {
                console.log(`Item ${index + 1} (${item.name}):`);
                console.log('  - review_dates:', item.review_dates);
                console.log('  - review_dates length:', item.review_dates?.length || 0);
            });
            console.log('==============================');
        }
    }, [displayItems, zustandItems]);

    // displayItemsが空の場合の追加デバッグ
    React.useEffect(() => {
        if (!displayItems || displayItems.length === 0) {
            console.log('[Box] displayItems is empty');
            console.log('[Box] zustandItems:', zustandItems);
            console.log('[Box] props.items:', items);
        }
    }, [displayItems, zustandItems, items]);

    // --- テーブル定義 ---
    // カラム数を動的に計算（両方のデータソースを統合して使用）
    const maxColumns = React.useMemo(() => {
        // データがない場合も1カラム分は確保
        let boxPatternColumns = 0;
        if (currentBox?.pattern_id) {
            const boxPattern = patterns.find((p) => p.id === currentBox.pattern_id);
            if (boxPattern?.steps) boxPatternColumns = boxPattern.steps.length;
        }
        const zustandItemColumns = (zustandItems && zustandItems.length > 0) ? Math.max(...zustandItems.map((i) => i.review_dates.length)) : 0;
        const propsItemColumns = items.length > 0 ? Math.max(...items.map((i) => i.review_dates.length)) : 0;
        const itemColumns = Math.max(zustandItemColumns, propsItemColumns);
        // 復習物がない場合も1カラム分は確保
        return Math.max(boxPatternColumns, itemColumns, 1);
    }, [currentBox, patterns, zustandItems, items]);

    // テーブル全体の幅を常に統一（復習物がある時の幅で固定）
    const baseWidth = 60 + 50 + 150 + 50 + 100; // 状態+操作+復習物名+詳細+学習日
    const reviewColumnWidth = Math.max(maxColumns, 1) * 130;
    const tableWidth = baseWidth + reviewColumnWidth;

    // テーブルのカラム定義
    const columns = React.useMemo<ColumnDef<ItemResponse>[]>(() => [
        {
            accessorKey: 'is_finished',
            header: () => (
                <span className="block w-full text-center">状態</span>
            ),
            size: 60,
            cell: ({ row }) => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const todaysReviewDate = row.original.review_dates.find(
                    (rd) => format(new Date(rd.scheduled_date), 'yyyy-MM-dd') === today,
                );

                if (!todaysReviewDate) {
                    return <span className="text-muted-foreground flex justify-center">-</span>;
                }

                if (todaysReviewDate.is_completed) {
                    return (
                        <Button
                            variant="ghost" size="sm"
                            className="bg-gray-800 hover:bg-gray-900 text-white border-white-400 w-full"
                            onClick={() => incompleteReviewMutation.mutate({ itemId: row.original.item_id, reviewDateId: todaysReviewDate.review_date_id, stepNumber: todaysReviewDate.step_number })}
                            disabled={incompleteReviewMutation.isPending}
                        >
                            取消
                        </Button>
                    );
                } else {
                    return (
                        <Button
                            variant="default" size="sm"
                            className="bg-green-700 hover:bg-green-800 text-white w-full"
                            onClick={() => completeReviewMutation.mutate({ itemId: row.original.item_id, reviewDateId: todaysReviewDate.review_date_id, stepNumber: todaysReviewDate.step_number })}
                            disabled={completeReviewMutation.isPending}
                        >
                            完了
                        </Button>
                    );
                }
            },
        },
        {
            id: 'actions',
            header: () => (
                <span className="block w-full text-center">操作</span>
            ),
            size: 50,
            cell: ({ row }) => (
                <div className="flex items-center flex justify-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingItem(row.original)}>
                        <PencilIcon className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
        {
            accessorKey: 'name',
            header: () => (
                <span className="block w-full text-center">復習物名</span>
            ),
            size: 150,
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
                    <Button variant="ghost" size="icon" onClick={() => setDetailItem(row.original)}>
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
                const isClickable = isToday;
                return (
                    <Button
                        variant={!reviewDate.is_completed && !isToday ? 'outline' : 'default'}
                        size="sm"
                        className={cn(
                            isToday && !reviewDate.is_completed && 'bg-blue-700 hover:bg-blue-800 text-gray-200',
                            isToday && reviewDate.is_completed && 'bg-blue-900 hover:bg-blue-950 text-gray-400',
                            !isToday && reviewDate.is_completed && 'bg-green-700 text-white',
                            !isClickable && 'cursor-not-allowed opacity-50',
                        )}
                        onClick={isClickable ? () => setEditingDate({ item: row.original, reviewDate }) : undefined}
                        disabled={!isClickable}
                    >
                        {format(new Date(reviewDate.scheduled_date), 'yyyy-MM-dd')}
                    </Button>
                );
            },
        })),
    ], [zustandItems, items, maxColumns, completeReviewMutation, incompleteReviewMutation]);

    return (
        <>
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* --- ヘッダー部分 --- */}
                <div className="flex items-center justify-between pb-3 pt-3">
                    <h1
                        className="text-2xl font-bold tracking-tight max-w-full truncate flex-1 min-w-0"
                        title={currentBox?.name || "未分類ボックス"}
                    >
                        {currentBox
                            ? `ボックス：${currentBox.name}`
                            : "未分類ボックス"}
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setFinishedItemsModalOpen(true)}>
                            完了済みを確認
                        </Button>
                        {currentBox && (
                            <>
                                <Button variant="ghost" size="icon" onClick={() => setSummaryModalOpen(true)}>
                                    <InformationCircleIcon className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setEditBoxModalOpen(true)}>
                                    <CogIcon className="h-5 w-5" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* --- スクロール可能なテーブル領域 --- */}
                <Card className="flex-1 min-h-0">
                    <CardContent className="h-full p-0">
                        {showSkeleton ? (
                            <TableSkeleton />
                        ) : (
                            <DataTable
                                columns={columns}
                                data={displayItems}
                                enablePagination={false}
                                maxHeight="100%"
                                fixedColumns={5}
                                tableWidth={tableWidth}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>


            {/* --- この画面で使われるモーダル群 --- */}
            {detailItem && <ItemDetailModal isOpen={!!detailItem} onClose={() => setDetailItem(null)} item={detailItem} />}
            {editingItem && <EditItemModal isOpen={!!editingItem} onClose={() => setEditingItem(null)} item={editingItem} />}
            {deletingItem && (
                <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>本当に「{deletingItem.name}」を削除しますか？</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
                        <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(deletingItem.item_id)} disabled={deleteMutation.isPending}>
                                {deleteMutation.isPending ? '削除中...' : '削除する'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {editingDate && <EditReviewDateModal isOpen={!!editingDate} onClose={() => setEditingDate(null)} data={editingDate} />}
            {currentBox && <BoxSummaryModal isOpen={isSummaryModalOpen} onClose={() => setSummaryModalOpen(false)} box={currentBox} itemCount={items.length} />}
            {currentCategory && currentBox && <EditBoxModal isOpen={isEditBoxModalOpen} onClose={() => setEditBoxModalOpen(false)} category={currentCategory} box={currentBox} />}
            <FinishedItemsModal isOpen={isFinishedItemsModalOpen} onClose={() => setFinishedItemsModalOpen(false)} boxId={boxId} categoryId={categoryId} />
        </>
    );
};