import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// API & Store
import { deleteItem, completeReviewDate, incompleteReviewDate } from '@/api/itemApi';
import { useItemStore } from '@/store';
import { ItemResponse, ReviewDateResponse, GetCategoryOutput, GetBoxOutput } from '@/types';
import { cn } from '@/lib/utils';
import { usePatternStore } from '@/store/patternStore';

// UI
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Cog6ToothIcon, InformationCircleIcon, PencilIcon, DocumentTextIcon, ChevronDoubleLeftIcon, InboxIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import NameCell from '@/components/shared/NameCell';
import { SortDropdown } from '@/components/shared/SortDropdown';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// モーダル
import { ItemDetailModal } from '@/components/modals/ItemDetailModal';
import { EditItemModal } from '@/components/modals/EditItemModal';
import { EditReviewDateModal } from '@/components/modals/EditReviewDateModal';
import { BoxSummaryModal } from '@/components/modals/BoxSummaryModal';
import { EditBoxModal } from '@/components/modals/EditBoxModal';
import { FinishedItemsModal } from '@/components/modals/FinishedItemsModal';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CreateItemModal } from '@/components/modals/CreateItemModal';

interface BoxProps {
    items: ItemResponse[];
    isLoading: boolean;
    currentCategory: GetCategoryOutput | undefined;
    currentBox: GetBoxOutput | null | undefined;
}

/**
 * ボックス詳細ページのメインコンテンツ。
 * 復習物の一覧テーブルと、関連する操作を担当する。
 */
export const Box = ({ items, isLoading, currentCategory, currentBox }: BoxProps) => {
    const { t } = useTranslation();
    // --- Hooks ---
    const { categoryId, boxId } = useParams<{ categoryId: string; boxId: string }>();
    const queryClient = useQueryClient();

    // --- Zustandストア ---
    const { getItemsForBox, removeItemFromBox } = useItemStore();

    // --- State (モーダル管理) ---
    const [detailItem, setDetailItem] = React.useState<ItemResponse | null>(null);
    const [editingItem, setEditingItem] = React.useState<ItemResponse | null>(null);
    const [deletingItem, setDeletingItem] = React.useState<ItemResponse | null>(null);
    const [editingReviewDate, seteditingReviewDate] = React.useState<{ item: ItemResponse; reviewDate: ReviewDateResponse } | null>(null);
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

    // --- State (ソート) ---
    const [itemSortOrder, setItemSortOrder] = React.useState('registered_at_desc');
    const itemSortOptions = [
        { value: 'name_asc', label: t('sort.nameAsc') },
        { value: 'name_desc', label: t('sort.nameDesc') },
        { value: 'learned_date_desc', label: t('sort.createdDesc') },
        { value: 'learned_date_asc', label: t('sort.createdAsc') },
        { value: 'registered_at_desc', label: t('sort.createdDesc') },
        { value: 'registered_at_asc', label: t('sort.createdAsc') },
        { value: 'edited_at_desc', label: t('sort.updatedDesc') },
        { value: 'edited_at_asc', label: t('sort.updatedAsc') },
    ];

    // --- State (絞り込み) ---
    const [filterType, setFilterType] = React.useState<'all' | 'today'>('all');
    const filterTypeLabel = filterType === 'all' ? t('common.all') : t('home.todaysReview');

    // --- Mutations ---
    const deleteMutation = useMutation({
        mutationFn: (itemId: string) => deleteItem(itemId),
        onSuccess: (_, itemId) => {
            toast.success(t('notification.itemDeleted'));
            if (boxId) removeItemFromBox(boxId, itemId);
            queryClient.invalidateQueries({ queryKey: ['items', boxId, categoryId] });
        },
        onError: (err: any) => toast.error(t('error.deleteFailed', { message: err.message })),
        onSettled: () => setDeletingItem(null),
    });

    const completeReviewMutation = useMutation({
        mutationFn: ({ itemId, reviewDateId, stepNumber }: { itemId: string; reviewDateId: string; stepNumber: number; }) => completeReviewDate({ itemId, reviewDateId, data: { step_number: stepNumber } }),
        onSuccess: (_, _variables) => {
            toast.success(t('notification.reviewCompleted'));
            queryClient.invalidateQueries({ queryKey: ['items', boxId, categoryId] });
            // 完了済み復習物一覧のキャッシュも無効化
            queryClient.invalidateQueries({ queryKey: ['finishedItems', { boxId, categoryId }] });
        },
        onError: (err: any) => toast.error(t('error.completeFailed', { message: err.message })),
    });

    const incompleteReviewMutation = useMutation({
        mutationFn: ({ itemId, reviewDateId, stepNumber }: { itemId: string; reviewDateId: string; stepNumber: number; }) => incompleteReviewDate({ itemId, reviewDateId, data: { step_number: stepNumber } }),
        onSuccess: () => {
            toast.success(t('notification.reviewMarkedIncomplete'));
            queryClient.invalidateQueries({ queryKey: ['items', boxId, categoryId] });
            // 完了済み復習物一覧のキャッシュも無効化
            queryClient.invalidateQueries({ queryKey: ['finishedItems', { boxId, categoryId }] });
        },
        onError: (err: any) => toast.error(t('error.markIncompleteFailed', { message: err.message })),
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

    // --- 復習物リストの取得 ---
    let storeBoxId = boxId;
    if ((boxId === 'unclassified' || !boxId) && categoryId && categoryId !== 'unclassified') {
        storeBoxId = `unclassified-${categoryId}`;
    } else if (!boxId || boxId === 'unclassified') {
        storeBoxId = 'unclassified';
    }

    const zustandItems = getItemsForBox(storeBoxId || '');;


    // --- スケルトン表示制御 ---
    const showSkeleton = isLoading && (!zustandItems || zustandItems.length === 0);
    const displayItems = zustandItems && zustandItems.length > 0 ? zustandItems : items;



    // --- テーブル定義 ---
    // カラム数を動的に計算（ボックスのパターンのステップ数を基準に表示）
    const { patterns } = usePatternStore();
    const pattern = React.useMemo(() => {
        if (!currentBox?.pattern_id) return null;
        return patterns.find((p) => p.id === currentBox.pattern_id) || null;
    }, [patterns, currentBox?.pattern_id]);

    // 未分類ボックスの場合、復習物の最大review_dates数を使用
    const maxColumns = React.useMemo(() => {
        if (pattern) {
            return pattern.steps.length;
        }

        // 未分類ボックスの場合：全復習物の最大review_dates数を計算
        if (displayItems && displayItems.length > 0) {
            const maxReviewDates = Math.max(...displayItems.map(item => item.review_dates?.length || 0));
            return maxReviewDates;
        }

        return 0;
    }, [pattern, displayItems]);


    // テーブル全体の幅を動的に計算
    const baseWidth = 60 + 50 + nameColumnWidth + 50 + 100; // 状態+操作+復習物名+詳細+学習日
    const reviewColumnWidth = maxColumns * 130;
    const tableWidth = baseWidth + reviewColumnWidth;

    // テーブルのカラム定義
    const columns = React.useMemo<ColumnDef<ItemResponse>[]>(() => [
        {
            accessorKey: 'is_finished',
            header: () => (
                <span className="block w-full text-center">{t('item.status')}</span>
            ),
            size: 70,

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
                            {t('common.cancel')}
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
                            {t('common.finish')}
                        </Button>
                    );
                }
            },
        },
        {
            id: 'actions',
            header: () => (
                <span className="block w-full text-center">{t('item.operations')}</span>
            ),
            size: 65,
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
                    <span className="block w-full text-center">{t('item.name')}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 h-4 w-4 p-0 hover:bg-gray-200"
                        onClick={handleResetWidth}
                        title={t('common.resetWidth')}
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
                <span className="block w-full text-center">{t('item.detail')}</span>
            ),
            size: 60,
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
                <span className="block w-full text-center">{t('item.learningDate')}</span>
            ),
            size: 110,
            cell: ({ row }) => {
                const learnedDate = row.original.learned_date;
                if (!learnedDate || learnedDate === 'null' || learnedDate === 'undefined') {
                    return <div className="flex justify-center text-muted-foreground">-</div>;
                }
                try {
                    const date = new Date(learnedDate);
                    if (isNaN(date.getTime())) {
                        return <div className="flex justify-center text-muted-foreground">-</div>;
                    }
                    return (
                        <div className="flex justify-center">
                            {format(date, 'yyyy-MM-dd')}
                        </div>
                    );
                } catch (error) {
                    return <div className="flex justify-center text-muted-foreground">-</div>;
                }
            },
        },
        ...Array.from({ length: maxColumns }).map((_, index) => ({
            id: `review_date_${index + 1}`,
            header: () => (
                <span className="block w-full text-center">{t('item.reviewCount', { count: index + 1, defaultValue: `${index + 1}回目` })}</span>
            ),
            size: 130,
            cell: ({ row }: { row: { original: ItemResponse } }) => {
                const reviewDate = row.original.review_dates?.[index];

                if (!reviewDate) {
                    return <span className="text-muted-foreground flex justify-center">-</span>;
                }

                let isToday = false;
                const scheduledDate = new Date(reviewDate.scheduled_date);
                if (!isNaN(scheduledDate.getTime())) {
                    isToday = format(scheduledDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                }
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
                            onClick={isClickable ? () => seteditingReviewDate({ item: row.original, reviewDate }) : undefined}
                            disabled={!isClickable}
                        >
                            {(() => {
                                try {
                                    const scheduledDate = new Date(reviewDate.scheduled_date);
                                    if (isNaN(scheduledDate.getTime())) {
                                        return '-';
                                    }
                                    return format(scheduledDate, 'yyyy-MM-dd');
                                } catch (error) {
                                    return '-';
                                }
                            })()}
                        </Button>
                    </div>
                );
            },
        })),
    ], [zustandItems, items, maxColumns, completeReviewMutation, incompleteReviewMutation, t]);

    // --- フィルタリング処理 ---
    const filteredDisplayItems = React.useMemo(() => {
        if (filterType === 'all') return displayItems;
        // 今日の復習: 今日のscheduled_dateを持つreview_dateが1つでもある復習物のみ
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        return displayItems.filter(item =>
            item.review_dates.some(rd =>
                format(new Date(rd.scheduled_date), 'yyyy-MM-dd') === todayStr
            )
        );
    }, [displayItems, filterType]);

    // --- ソート済み復習物リスト ---
    const sortedDisplayItems = React.useMemo(() => {
        if (!filteredDisplayItems) return [];
        const arr = [...filteredDisplayItems];
        switch (itemSortOrder) {
            case 'name_asc':
                return arr.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
            case 'name_desc':
                return arr.sort((a, b) => b.name.localeCompare(a.name, 'ja'));
            case 'learned_date_desc':
                return arr.sort((a, b) => new Date(b.learned_date).getTime() - new Date(a.learned_date).getTime());
            case 'learned_date_asc':
                return arr.sort((a, b) => new Date(a.learned_date).getTime() - new Date(b.learned_date).getTime());
            case 'registered_at_desc':
                return arr.sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime());
            case 'registered_at_asc':
                return arr.sort((a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime());
            case 'edited_at_desc':
                return arr.sort((a, b) => new Date(b.edited_at).getTime() - new Date(a.edited_at).getTime());
            case 'edited_at_asc':
                return arr.sort((a, b) => new Date(a.edited_at).getTime() - new Date(b.edited_at).getTime());
            default:
                return arr;
        }
    }, [filteredDisplayItems, itemSortOrder]);

    return (
        <div className="h-screen flex flex-col overflow-hidden ">
            <div className="flex-1 flex flex-col overflow-hidden p-0">
                {/* --- ヘッダー部分 --- */}
                <div className="flex items-center justify-between pb-2 pt-2">
                    <InboxIcon className="inline-block mr-2 h-6 w-6" />
                    <h1
                        className="text-lg font-bold tracking-tight max-w-full truncate flex-1 min-w-0"
                        title={currentBox?.name || t('box.unclassified')}
                    >
                        {currentBox
                            ? `${t('box.label')}：${currentBox.name}`
                            : t('box.unclassified')}
                    </h1>
                    <div className="flex items-center gap-2">
                        {(currentBox || boxId === 'unclassified' || (boxId && boxId.startsWith('unclassified-'))) && (
                            <Button variant="default" onClick={() => setCreateItemModalOpen(true)}>
                                {t('item.create')}
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setFinishedItemsModalOpen(true)}>
                            {t('box.completedItems')}
                        </Button>
                        {/* DropdownMenuで絞り込み */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-[125px] flex items-center justify-between px-3">
                                    <span className="flex-1 text-left truncate">{filterTypeLabel}</span>
                                    <ChevronDownIcon className="ml-2 h-4 w-4 flex-shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilterType('all')} className={filterType === 'all' ? 'font-bold text-primary' : ''}>
                                    {t('common.all')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterType('today')} className={filterType === 'today' ? 'font-bold text-primary' : ''}>
                                    {t('home.todaysReview')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <SortDropdown
                            options={itemSortOptions}
                            value={itemSortOrder}
                            onValueChange={setItemSortOrder}
                            className="w-[175px]"
                        />
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
                                    data={sortedDisplayItems}
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
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('common.confirmDelete', { name: deletingItem.name, defaultValue: t('box.deleteCompletely', { name: deletingItem.name, defaultValue: `本当に「${deletingItem.name}」を削除しますか？` }) })}</AlertDialogTitle>
                            </AlertDialogHeader>
                            <AlertDialogDescription>{t('item.itemDescription')}</AlertDialogDescription>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(deletingItem.item_id)} disabled={deleteMutation.isPending}>
                                    {deleteMutation.isPending ? t('loading.deleting') : t('common.delete')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
                {editingReviewDate && <EditReviewDateModal isOpen={!!editingReviewDate} onClose={() => seteditingReviewDate(null)} data={editingReviewDate} />}
                {currentBox && <BoxSummaryModal isOpen={isSummaryModalOpen} onClose={() => setSummaryModalOpen(false)} box={currentBox} itemCount={items.length} />}
                {currentCategory && currentBox && <EditBoxModal isOpen={isEditBoxModalOpen} onClose={() => setEditBoxModalOpen(false)} category={currentCategory} box={currentBox} />}
                <FinishedItemsModal isOpen={isFinishedItemsModalOpen} onClose={() => setFinishedItemsModalOpen(false)} boxId={boxId} categoryId={categoryId} />
                {/* 復習物作成モーダル */}
                {(currentBox || boxId === 'unclassified' || (boxId && boxId.startsWith('unclassified-'))) && (
                    <CreateItemModal
                        isOpen={isCreateItemModalOpen}
                        onClose={() => setCreateItemModalOpen(false)}
                        defaultCategoryId={currentBox ? currentBox.category_id : categoryId || ''}
                        defaultBoxId={currentBox ? currentBox.id : boxId || ''}
                    />
                )}
            </div>
        </div>
    );
};