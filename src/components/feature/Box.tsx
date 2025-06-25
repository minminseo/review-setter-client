import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';

// API & Store
import { deleteItem, completeReviewDate, incompleteReviewDate } from '@/api/itemApi';
import { useItemStore } from '@/store';
import { ItemResponse, ReviewDateResponse, GetCategoryOutput, GetBoxOutput } from '@/types';
import { cn } from '@/lib/utils';
import { usePatternStore } from '@/store/patternStore';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Cog6ToothIcon, InformationCircleIcon, PencilIcon, DocumentTextIcon, ChevronDoubleLeftIcon, InboxIcon } from '@heroicons/react/24/outline';
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CreateItemModal } from '@/components/modals/CreateItemModal';

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

    // --- Zustandストア ---
    const { getItemsForBox, removeItemFromBox } = useItemStore();

    // --- State (モーダル管理) ---
    const [detailItem, setDetailItem] = React.useState<ItemResponse | null>(null);
    const [editingItem, setEditingItem] = React.useState<ItemResponse | null>(null);
    const [deletingItem, setDeletingItem] = React.useState<ItemResponse | null>(null);
    const [editingDate, setEditingDate] = React.useState<{ item: ItemResponse; reviewDate: ReviewDateResponse } | null>(null);
    const [isSummaryModalOpen, setSummaryModalOpen] = React.useState(false);
    const [isEditBoxModalOpen, setEditBoxModalOpen] = React.useState(false);
    const [isFinishedItemsModalOpen, setFinishedItemsModalOpen] = React.useState(false);
    const [isCreateItemModalOpen, setCreateItemModalOpen] = React.useState(false);

    // --- State (復習物名列の幅調整) ---
    const [nameColumnWidth, setNameColumnWidth] = React.useState(300);
    const [isResizing, setIsResizing] = React.useState(false);
    const [isHovering, setIsHovering] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [startWidth, setStartWidth] = React.useState(0);

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

    // --- アイテムリストの取得ロジック ---
    console.log('=== Box Component storeBoxId calculation ===');
    console.log('[Box] Input params:', { boxId, categoryId });
    
    let storeBoxId = boxId;
    if ((boxId === 'unclassified' || !boxId) && categoryId && categoryId !== 'unclassified') {
        console.log('[Box] → Condition: Category unclassified');
        storeBoxId = `unclassified-${categoryId}`;
    } else if (!boxId || boxId === 'unclassified') {
        console.log('[Box] → Condition: Full unclassified');
        storeBoxId = 'unclassified';
    } else {
        console.log('[Box] → Condition: Normal box');
    }
    
    console.log('[Box] Calculated storeBoxId:', storeBoxId);
    const zustandItems = getItemsForBox(storeBoxId || '');
    console.log('[Box] Retrieved zustandItems count:', zustandItems?.length || 0);
    console.log('==========================================');

    // デバッグ用ログ
    React.useEffect(() => {
        console.log('=== Box Component useEffect Debug ===');
        console.log('[Box] storeBoxId:', storeBoxId);
        console.log('[Box] zustandItems count:', zustandItems?.length || 0);
        console.log('[Box] zustandItems:', zustandItems);
        console.log('[Box] props.items count:', items?.length || 0);
        console.log('[Box] props.items:', items);
        console.log('[Box] params:', { categoryId, boxId });
        console.log('====================================');
    }, [storeBoxId, zustandItems, items, categoryId, boxId]);

    // --- スケルトン表示制御 ---
    const showSkeleton = isLoading && (!zustandItems || zustandItems.length === 0);
    const displayItems = zustandItems && zustandItems.length > 0 ? zustandItems : items;

    console.log('=== Box displayItems Decision ===');
    console.log('[Box] showSkeleton:', showSkeleton);
    console.log('[Box] isLoading:', isLoading);
    console.log('[Box] zustandItems length:', zustandItems?.length || 0);
    console.log('[Box] props.items length:', items?.length || 0);
    console.log('[Box] displayItems source:', zustandItems && zustandItems.length > 0 ? 'zustand' : 'props');
    console.log('[Box] displayItems length:', displayItems?.length || 0);
    console.log('=================================');

    // デバッグ用：displayItemsのreview_datesをチェック
    React.useEffect(() => {
        console.log('=== Box displayItems useEffect Debug ===');
        console.log('[Box] displayItems length:', displayItems?.length || 0);
        
        if (displayItems && displayItems.length > 0) {
            console.log('[Box] displayItems source:', zustandItems && zustandItems.length > 0 ? 'zustand' : 'props');
            console.log('[Box] displayItems count:', displayItems.length);
            displayItems.forEach((item, index) => {
                console.log(`  Item ${index + 1} (${item.name}):`);
                console.log('    - review_dates:', item.review_dates);
                console.log('    - review_dates length:', item.review_dates?.length || 0);
            });
        } else {
            console.log('[Box] displayItems is empty or null');
            console.log('[Box] zustandItems:', zustandItems);
            console.log('[Box] props.items:', items);
            console.log('[Box] Debugging why displayItems is empty:');
            console.log('  - zustandItems exists:', !!zustandItems);
            console.log('  - zustandItems.length > 0:', zustandItems && zustandItems.length > 0);
            console.log('  - items exists:', !!items);
            console.log('  - items.length:', items?.length || 0);
        }
        console.log('========================================');
    }, [displayItems, zustandItems, items]);

    // --- テーブル定義 ---
    // カラム数を動的に計算（ボックスの復習パターンのステップ数を基準に表示）
    const { patterns } = usePatternStore();
    const pattern = React.useMemo(() => {
        if (!currentBox?.pattern_id) return null;
        return patterns.find((p) => p.id === currentBox.pattern_id) || null;
    }, [patterns, currentBox?.pattern_id]);
    
    // 未分類ボックスの場合、アイテムの最大review_dates数を使用
    const maxColumns = React.useMemo(() => {
        if (pattern) {
            return pattern.steps.length;
        }
        
        // 未分類ボックスの場合：全アイテムの最大review_dates数を計算
        if (displayItems && displayItems.length > 0) {
            const maxReviewDates = Math.max(...displayItems.map(item => item.review_dates?.length || 0));
            console.log('[Box] Calculated maxColumns from items:', maxReviewDates);
            return maxReviewDates;
        }
        
        return 0;
    }, [pattern, displayItems]);
    
    console.log('=== Box Table Configuration Debug ===');
    console.log('[Box] currentBox:', currentBox);
    console.log('[Box] pattern:', pattern);
    console.log('[Box] maxColumns:', maxColumns);
    console.log('[Box] displayItems for table:', displayItems);
    console.log('====================================');

    // テーブル全体の幅を動的に計算
    const baseWidth = 60 + 50 + nameColumnWidth + 50 + 100; // 状態+操作+復習物名+詳細+学習日
    const reviewColumnWidth = maxColumns * 130;
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-200 hover:text-gray-400 transition-colors" onClick={() => setEditingItem(row.original)}>
                        <PencilIcon className="h-4 w-4" />
                    </Button>
                </div>
            ),
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
                const reviewDate = row.original.review_dates?.[index];
                console.log(`[Box] Review column ${index + 1} for item "${row.original.name}":`, {
                    review_dates_length: row.original.review_dates?.length || 0,
                    reviewDate: reviewDate,
                    index: index
                });
                
                if (!reviewDate) {
                    console.log(`[Box] No review date at index ${index} for item "${row.original.name}"`);
                    return <span className="text-muted-foreground flex justify-center">-</span>;
                }
                
                const isToday = format(new Date(reviewDate.scheduled_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const isClickable = isToday && !reviewDate.is_completed;
                return (
                    <div className="flex items-center justify-center">
                        <Button
                            variant={!reviewDate.is_completed && !isToday ? 'outline' : 'default'}
                            size="sm"
                            className={cn(
                                isToday && !reviewDate.is_completed && 'bg-blue-800 hover:bg-blue-900 text-gray-200',
                                isToday && reviewDate.is_completed && 'bg-blue-900 text-gray-400',
                                !isToday && reviewDate.is_completed && 'bg-green-700 text-white',
                                !isClickable && 'cursor-not-allowed opacity-50',
                            )}
                            onClick={isClickable ? () => setEditingDate({ item: row.original, reviewDate }) : undefined}
                            disabled={!isClickable}
                        >
                            {format(new Date(reviewDate.scheduled_date), 'yyyy-MM-dd')}
                        </Button>
                    </div>
                );
            },
        })),
    ], [zustandItems, items, maxColumns, completeReviewMutation, incompleteReviewMutation]);

    return (
        <div className="h-screen flex flex-col overflow-hidden ">
            <div className="flex-1 flex flex-col overflow-hidden p-0">
                {/* --- ヘッダー部分 --- */}
                <div className="flex items-center justify-between pb-2 pt-2">
                    <InboxIcon className="inline-block mr-2 h-6 w-6" />
                    <h1
                        className="text-lg font-bold tracking-tight max-w-full truncate flex-1 min-w-0"
                        title={currentBox?.name || "未分類ボックス"}
                    >
                        {currentBox
                            ? `ボックス：${currentBox.name}`
                            : "未分類ボックス"}
                    </h1>
                    <div className="flex items-center gap-2">
                        {currentBox && (
                            <Button variant="default" onClick={() => setCreateItemModalOpen(true)}>
                                復習物を作成
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setFinishedItemsModalOpen(true)}>
                            完了済みを確認
                        </Button>
                        {currentBox && (
                            <>
                                <Button variant="ghost" size="icon" onClick={() => setSummaryModalOpen(true)}>
                                    <InformationCircleIcon className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setEditBoxModalOpen(true)}>
                                    <Cog6ToothIcon className="h-5 w-5" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* --- スクロール可能なテーブル領域 --- */}
                <Card className="flex-1 min-h-0 p-0 py-0">
                    <CardContent className="p-0 h-full ">
                        <ScrollArea className="w-full h-full max-h-[calc(100vh-200px)] rounded-xl whitespace-nowrap pr-3 pb-4">

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
                            <ScrollBar orientation="horizontal" className="!bg-transparent ml-2 [&>div]:!bg-gray-600 !h-1.5" />
                        </ScrollArea>
                    </CardContent>
                </Card>





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
                {/* 復習物作成モーダル */}
                {currentBox && (
                    <CreateItemModal
                        isOpen={isCreateItemModalOpen}
                        onClose={() => setCreateItemModalOpen(false)}
                        defaultCategoryId={currentBox.category_id}
                        defaultBoxId={currentBox.id}
                    />
                )}
            </div>
        </div>
    );
};