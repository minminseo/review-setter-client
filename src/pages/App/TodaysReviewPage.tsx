import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { ArrowRightEndOnRectangleIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon, ChevronDoubleLeftIcon } from '@heroicons/react/24/outline';
import { MoreHorizontal } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// API & Store & Types
import {
    fetchTodaysReviews, // フィルター機能を持つように変更したと仮定
    completeReviewDate,
    incompleteReviewDate
} from '@/api/itemApi';
import { fetchCategories } from '@/api/categoryApi';
import { fetchBoxes } from '@/api/boxApi'; // ボックス取得APIをインポート
import { useItemStore, useCategoryStore, useBoxStore, usePatternStore } from '@/store';
import { useModal } from '@/contexts/ModalContext';
import { DailyReviewDate, GetDailyReviewDatesResponse, ItemResponse, ReviewDateResponse } from '@/types';
import { UNCLASSIFIED_ID } from '@/constants';

// Shared & UI Components
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Modals
import { SelectCategoryModal } from '@/components/modals/SelectCategoryModal';
import { SelectBoxModal } from '@/components/modals/SelectBoxModal';
import { ItemDetailModal } from '@/components/modals/ItemDetailModal';
import { EditReviewDateModal } from '@/components/modals/EditReviewDateModal';
import NameCell from '@/components/shared/NameCell';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

/**
 * APIから取得したネストされた今日の復習データを、テーブルで表示しやすいようにフラットな配列に変換するヘルパー関数
 * @param data - APIからのレスポンスデータ
 * @returns フラット化された復習日オブジェクトの配列
 */
const flattenTodaysReviews = (data: GetDailyReviewDatesResponse | undefined): DailyReviewDate[] => {
    if (!data) return [];
    const allReviews: DailyReviewDate[] = [];
    data.categories.forEach(category => {
        category.boxes.forEach(box => {
            allReviews.push(
                ...box.review_dates.map(rd => ({
                    ...rd,
                    item_id: rd.item_id,
                    target_weight: box.target_weight
                }))
            );
        });
        allReviews.push(
            ...category.unclassified_daily_review_dates_by_category.map(rd => ({
                ...rd,
                item_id: rd.item_id,
                box_id: null,
            }))
        );
    });
    allReviews.push(
        ...data.daily_review_dates_grouped_by_user.map(rd => ({
            ...rd,
            item_id: rd.item_id ?? rd.review_date_id,
            category_id: null,
            box_id: null,
        }))
    );
    return allReviews;
};

const TodaysReviewPage = () => {

    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { t } = useTranslation();
    const { categories, setCategories } = useCategoryStore();
    const { boxesByCategoryId, setBoxesForCategory } = useBoxStore();
    const { setTodaysReviews } = useItemStore();
    const { patterns } = usePatternStore();

    const { updateCreateItemContext } = useModal();

    // URLパラメータから初期値を取得
    const categoryParam = searchParams.get('category') || 'all';
    const boxParam = searchParams.get('box') || 'all';

    // フィルターの状態管理
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>(categoryParam);
    const [selectedBoxId, setSelectedBoxId] = React.useState<string>(boxParam);

    // モーダルの状態管理
    const [isSelectCategoryModalOpen, setSelectCategoryModalOpen] = React.useState(false);
    const [isSelectBoxModalOpen, setSelectBoxModalOpen] = React.useState(false);

    // タブのレスポンシブ表示制御
    const categoryTabsContainerRef = useRef<HTMLDivElement>(null);
    const boxTabsContainerRef = useRef<HTMLDivElement>(null);
    const [maxCategoryTabs, setMaxCategoryTabs] = useState<number>(7);
    const [maxBoxTabs, setMaxBoxTabs] = useState<number>(7);

    // 詳細用の状態
    const [detailItem, setDetailItem] = React.useState<DailyReviewDate | null>(null);

    // EditReviewDateModal用の状態
    const [editingReviewDate, setEditingReviewDate] = React.useState<{ item: ItemResponse; reviewDate: ReviewDateResponse } | null>(null);

    // (復習物名列の幅調整)
    const [nameColumnWidth, setNameColumnWidth] = React.useState(300);
    const [isResizing, setIsResizing] = React.useState(false);
    const [isHovering, setIsHovering] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [startWidth, setStartWidth] = React.useState(0);

    // データ取得
    // 1. カテゴリー一覧 (フィルタータブ用)
    const { data: fetchedCategories, isSuccess: catSuccess } = useQuery({
        queryKey: ['categories'],
        queryFn: fetchCategories
    });

    // 2. 選択されたカテゴリーに属するボックスリスト
    const { data: fetchedBoxesForCategory } = useQuery({
        queryKey: ['boxes', selectedCategoryId],
        queryFn: () => fetchBoxes(selectedCategoryId),
        enabled: selectedCategoryId !== 'all' && selectedCategoryId !== UNCLASSIFIED_ID,
    });

    // 3. 今日の復習リスト（フィルター適用）
    const { data: reviewItems, isLoading } = useQuery({
        queryKey: ['todaysReviews', selectedCategoryId, selectedBoxId],
        queryFn: fetchTodaysReviews,
        placeholderData: (previousData) => previousData, // ローディング中に古いデータを表示
    });

    // データ取得後の副作用 (ストアの更新)
    React.useEffect(() => {
        if (catSuccess && fetchedCategories) {
            setCategories(fetchedCategories);
        }
    }, [catSuccess, fetchedCategories, setCategories]);

    React.useEffect(() => {
        if (fetchedBoxesForCategory && selectedCategoryId !== 'all' && selectedCategoryId !== UNCLASSIFIED_ID) {
            setBoxesForCategory(selectedCategoryId, fetchedBoxesForCategory);
        }
    }, [fetchedBoxesForCategory, selectedCategoryId, setBoxesForCategory]);

    React.useEffect(() => {
        if (reviewItems) {
            setTodaysReviews(reviewItems);
        }
    }, [reviewItems, setTodaysReviews]);

    // データ加工
    // APIから取得したデータをフラット化してテーブルに渡す
    const flattenedAndFilteredReviews = React.useMemo(() => {
        if (!reviewItems) return [];

        const flattened = flattenTodaysReviews(reviewItems);

        // クライアントサイドでの最終フィルタリング
        return flattened.filter(item => {
            const categoryMatch = selectedCategoryId === 'all' ||
                (selectedCategoryId === UNCLASSIFIED_ID ? item.category_id === null : item.category_id === selectedCategoryId);

            const boxMatch = selectedBoxId === 'all' ||
                (selectedBoxId === UNCLASSIFIED_ID ? item.box_id === null : item.box_id === selectedBoxId);

            // カテゴリーが'all'でなく、ボックスが'all'の場合、未分類ボックスも含む
            if (selectedCategoryId !== 'all' && selectedBoxId === 'all') {
                return categoryMatch;
            }

            return categoryMatch && boxMatch;
        });
    }, [reviewItems, selectedCategoryId, selectedBoxId]);


    // データ操作 (Mutation)
    const createMutationOptions = (_: boolean) => ({
        onSuccess: (_: any, _vars: any) => {
            toast.success(t('notification.reviewDateStatusUpdated'));
            queryClient.invalidateQueries({ queryKey: ['todaysReviews', selectedCategoryId, selectedBoxId] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
        },
        onError: (err: any) => toast.error(`更新に失敗しました: ${err.message}`),
    });

    const completeMutation = useMutation({ mutationFn: completeReviewDate, ...createMutationOptions(true) });
    const incompleteMutation = useMutation({ mutationFn: incompleteReviewDate, ...createMutationOptions(false) });

    // リサイズ機能
    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        setStartX(e.clientX);
        setStartWidth(nameColumnWidth);
    };

    const handleResizeMove = React.useCallback((e: MouseEvent) => {
        if (!isResizing) return;

        const diff = e.clientX - startX;
        const newWidth = Math.max(100, startWidth + diff);
        setNameColumnWidth(newWidth);
    }, [isResizing, startX, startWidth]);

    const handleResizeEnd = React.useCallback(() => {
        setIsResizing(false);
    }, []);

    const handleResetWidth = () => {
        setNameColumnWidth(300);
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

    // テーブルの列定義
    const columns = React.useMemo<ColumnDef<DailyReviewDate>[]>(() => [
        {
            id: 'is_completed',
            header: () => (
                <span className="block w-full text-center">{t('common.status')}</span>
            ),
            cell: ({ row }) => {
                const isCompleted = row.original.is_completed;
                return isCompleted ? (
                    <div className="flex items-center justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="bg-gray-800 hover:bg-gray-900 text-white border-white-400 w-full"
                            onClick={() => {
                                const { item_id, review_date_id, step_number } = row.original;
                                const mutationData = { itemId: item_id, reviewDateId: review_date_id, data: { step_number } };
                                incompleteMutation.mutate(mutationData);
                            }}
                            disabled={incompleteMutation.isPending}
                        >

                            {t('common.reviewCansel')}
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center">
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-green-700 hover:bg-green-800 text-white w-full"
                            onClick={() => {
                                const { item_id, review_date_id, step_number } = row.original;
                                const mutationData = { itemId: item_id, reviewDateId: review_date_id, data: { step_number } };
                                completeMutation.mutate(mutationData);
                            }}
                            disabled={completeMutation.isPending}
                        >
                            {t('common.finish')}
                        </Button>
                    </div>
                );
            },
            size: 70,
        },
        {
            accessorKey: 'item_name',
            header: () => (
                <div className="flex items-center justify-center relative">
                    <span className="block w-full text-center">{t('item.name')}</span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 h-4 w-4 p-0 hover:bg-gray-200"
                        onClick={handleResetWidth}
                        title={t('common.resetWidth', '幅を初期化')}
                    >
                        <ChevronDoubleLeftIcon className="h-3 w-3" />
                    </Button>
                </div>
            ),
            size: nameColumnWidth,
            cell: ({ row }) => <NameCell name={row.original.item_name} />,
        },
        {
            id: 'detail',
            header: () => (
                <span className="block w-full text-center">{t('common.details')}</span>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    <Button variant="ghost" size="icon" onClick={() => setDetailItem(row.original)}>
                        <DocumentTextIcon className="h-5 w-5" />
                    </Button>
                </div>
            ),
            size: 60,
        },
        {
            id: 'target_weight',
            header: () => (
                <span className="block w-full text-center">{t('item.weight')}</span>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    {row.original.target_weight ? row.original.target_weight : '-'}
                </div>
            ),
            size: 60,
        },
        {
            accessorKey: 'step_number',
            header: () => (
                <span className="block w-full text-center">{t('pattern.step')}</span>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    {row.original.step_number}
                </div>
            ),
            size: 80,
        },
        {
            id: 'learned_date',
            header: () => (
                <span className="block w-full text-center">{t('item.learningDate')}</span>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    {row.original.learned_date || '-'}
                </div>
            ),
            size: 110,
        },
        {
            id: 'prev',
            header: () => (
                <span className="block w-full text-center">prev</span>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    {row.original.prev_scheduled_date || '-'}
                </div>
            ),
            size: 100,

        },
        {
            id: 'current',
            header: () => (
                <span className="block w-full text-center">current</span>
            ),
            cell: ({ row }) => {
                const scheduledDate = row.original.scheduled_date;
                if (!scheduledDate) {
                    return <span className="text-muted-foreground flex justify-center">-</span>;
                }

                let isToday = false;
                const scheduledDateObj = new Date(scheduledDate);
                if (!isNaN(scheduledDateObj.getTime())) {
                    isToday = format(scheduledDateObj, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                }
                const isClickable = isToday && !row.original.is_completed;

                return (
                    <div className="flex items-center justify-center">
                        <Button
                            variant={!row.original.is_completed && !isToday ? 'outline' : 'default'}
                            size="sm"
                            className={cn(
                                isToday && !row.original.is_completed && 'bg-blue-800 hover:bg-blue-900 text-gray-200',
                                isToday && row.original.is_completed && 'bg-blue-900 text-gray-400',
                                !isToday && row.original.is_completed && 'bg-green-700 text-white',
                                !isClickable && 'cursor-not-allowed opacity-50',
                            )}
                            onClick={isClickable ? () => setEditingReviewDate({
                                item: {
                                    item_id: row.original.item_id,
                                    user_id: '',
                                    name: row.original.item_name,
                                    detail: row.original.detail || null,
                                    category_id: row.original.category_id || null,
                                    box_id: row.original.box_id || null,
                                    pattern_id: null,
                                    learned_date: row.original.learned_date || '',
                                    is_finished: false,
                                    registered_at: '',
                                    edited_at: '',
                                    review_dates: []
                                } as ItemResponse,
                                reviewDate: {
                                    review_date_id: row.original.review_date_id,
                                    user_id: '',
                                    category_id: row.original.category_id || null,
                                    box_id: row.original.box_id || null,
                                    item_id: row.original.item_id,
                                    step_number: row.original.step_number,
                                    initial_scheduled_date: row.original.initial_scheduled_date,
                                    scheduled_date: row.original.scheduled_date,
                                    is_completed: row.original.is_completed
                                } as ReviewDateResponse
                            }) : undefined}
                            disabled={!isClickable}
                        >
                            {(() => {
                                try {
                                    const scheduledDateObj = new Date(scheduledDate);
                                    if (isNaN(scheduledDateObj.getTime())) {
                                        return '-';
                                    }
                                    return format(scheduledDateObj, 'yyyy-MM-dd');
                                } catch (error) {
                                    return '-';
                                }
                            })()}
                        </Button>
                    </div>
                );
            },
            size: 130,

        },
        {
            id: 'next',
            header: () => (
                <span className="block w-full text-center">next</span>
            ),
            cell: ({ row }) => (
                <div className="flex items-center justify-center">
                    {row.original.next_scheduled_date || '-'}
                </div>
            ),
            size: 100,

        },
    ], [completeMutation, incompleteMutation, patterns]);

    // テーブル全体の幅を動的に計算
    const tableWidth = React.useMemo(() => {
        // 基本カラム（状態 + 復習物名 + 詳細 + 重さ + ステップ + 学習日）の幅
        const baseWidth = 60 + nameColumnWidth + 50 + 55 + 80 + 100; // 動的に計算
        // スクロール可能カラム（prev + current + next）の幅（prev:100px, current:130px, next:100px）
        const scrollableColumnWidth = 100 + 130 + 100;
        // 最小幅を設定
        const totalWidth = Math.max(baseWidth + scrollableColumnWidth, 600);
        return totalWidth;
    }, [nameColumnWidth]);

    // URLパラメータが変更された際の同期処理
    React.useEffect(() => {
        const categoryParam = searchParams.get('category') || 'all';
        const boxParam = searchParams.get('box') || 'all';

        if (categoryParam !== selectedCategoryId) {
            setSelectedCategoryId(categoryParam);
        }
        if (boxParam !== selectedBoxId) {
            setSelectedBoxId(boxParam);
        }
    }, [searchParams, selectedCategoryId, selectedBoxId]);

    // タブ選択状況が変更されたときにModalContextを更新
    React.useEffect(() => {
        updateCreateItemContext({
            categoryId: selectedCategoryId === 'all' ? 'unclassified' : selectedCategoryId,
            boxId: selectedBoxId === 'all' ? 'unclassified' : selectedBoxId
        });
    }, [selectedCategoryId, selectedBoxId, updateCreateItemContext]);

    // イベントハンドラ
    const handleCategoryChange = (newCategoryId: string) => {
        setSelectedCategoryId(newCategoryId);
        setSelectedBoxId('all'); // カテゴリー変更時はボックス選択をリセット

        // URLパラメータを更新
        if (newCategoryId === 'all') {
            setSearchParams({}, { replace: true }); // クエリなし（/today）
        } else {
            const newParams = new URLSearchParams();
            newParams.set('category', newCategoryId);
            newParams.set('box', 'all');
            setSearchParams(newParams, { replace: true });
        }
    };

    const handleBoxChange = (newBoxId: string) => {
        setSelectedBoxId(newBoxId);

        // URLパラメータを更新
        if (selectedCategoryId === 'all' && newBoxId === 'all') {
            setSearchParams({}, { replace: true }); // クエリなし（/today）
        } else {
            const newParams = new URLSearchParams();
            if (selectedCategoryId !== 'all') {
                newParams.set('category', selectedCategoryId);
            }
            if (newBoxId !== 'all') {
                newParams.set('box', newBoxId);
            }
            setSearchParams(newParams, { replace: true });
        }
    };

    const handleNavigate = () => {
        if (selectedCategoryId === 'all') navigate('/');
        else if (selectedBoxId === 'all') navigate(`/categories/${selectedCategoryId}`);
        else navigate(`/categories/${selectedCategoryId}/boxes/${selectedBoxId}`);
    };

    useEffect(() => {
        const calcTabs = () => {
            const tabMinWidth = 112;
            const moreButtonWidth = 40;

            if (categoryTabsContainerRef.current) {
                const containerWidth = categoryTabsContainerRef.current.offsetWidth;
                const availableWidth = containerWidth * 0.95 - moreButtonWidth;
                const fixedTabsWidth = 2 * tabMinWidth;
                const remainingWidth = availableWidth - fixedTabsWidth;
                const maxDynamicTabs = Math.max(0, Math.floor(remainingWidth / tabMinWidth));
                setMaxCategoryTabs(maxDynamicTabs);
            }

            if (boxTabsContainerRef.current) {
                const containerWidth = boxTabsContainerRef.current.offsetWidth;
                const availableWidth = containerWidth * 0.95 - moreButtonWidth;
                const fixedTabsCount = selectedCategoryId === 'all' ? 1 : 2;
                const fixedTabsWidth = fixedTabsCount * tabMinWidth;
                const remainingWidth = availableWidth - fixedTabsWidth;
                const maxDynamicTabs = Math.max(0, Math.floor(remainingWidth / tabMinWidth));
                setMaxBoxTabs(maxDynamicTabs);
            }
        };

        calcTabs();
        window.addEventListener('resize', calcTabs);
        return () => window.removeEventListener('resize', calcTabs);
    }, [selectedCategoryId]);

    // 表示用データ
    const boxesForSelectedCategory = React.useMemo(() => {
        if (!selectedCategoryId || selectedCategoryId === 'all' || selectedCategoryId === UNCLASSIFIED_ID) return [];
        return boxesByCategoryId[selectedCategoryId] || [];
    }, [boxesByCategoryId, selectedCategoryId]);

    const displayedCategories = categories.slice(0, maxCategoryTabs);
    const hasMoreCategories = categories.length > maxCategoryTabs;
    const displayedBoxes = boxesForSelectedCategory.slice(0, maxBoxTabs);
    const hasMoreBoxes = boxesForSelectedCategory.length > maxBoxTabs;

    return (
        <div className="h-screen flex flex-col overflow-hidden ">
            {/* 上部固定ヘッダー */}
            <div
                className="flex-shrink-0 space-y-4 bg-background z-10"
                style={{
                    position: 'sticky',
                    top: 0,
                    boxShadow: '0 2px 8px -4px rgba(0,0,0,0.08)',
                }}
            >
                <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: t('common.daily') }]} />
                <div
                    className="grid grid-cols-[auto_1fr] grid-rows-2 gap-x-4 gap-y-2 items-stretch w-full max-w-full"
                    style={{ minWidth: 'min-content' }}
                >

                    {/* カテゴリータブ */}
                    <div className="flex items-center">
                        <span className="text-sm font-semibold shrink-0">{t('category.label')}:</span>
                    </div>
                    <div className="flex items-center min-h-[2.5rem] w-full max-w-full overflow-hidden">
                        <div className="relative flex items-center w-full max-w-full" ref={categoryTabsContainerRef}>
                            <div className="flex overflow-hidden" style={{ width: hasMoreCategories ? 'calc(100% - 48px)' : '100%' }}>
                                <Tabs value={selectedCategoryId} onValueChange={handleCategoryChange}>
                                    <TabsList
                                        className="flex gap-0.5 bg-neutral-200 dark:bg-neutral-800"
                                        style={{
                                            width: 'fit-content',
                                            maxWidth: '100%'
                                        }}
                                    >
                                        <TabsTrigger value="all" className="justify-start text-left w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">{t('common.all')}</TabsTrigger>
                                        <TabsTrigger value={UNCLASSIFIED_ID} className="justify-start text-left w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">{t('common.unclassified')}</TabsTrigger>
                                        {displayedCategories.map((cat) => (
                                            <TabsTrigger key={cat.id} value={cat.id} className="w-[7rem] justify-start text-left shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">
                                                {cat.name}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </div>
                            {hasMoreCategories && (
                                <div className="absolute right-0 flex items-center justify-center bg-background" style={{ width: 48, height: '100%' }}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectCategoryModalOpen(true)}
                                        className="shrink-0 h-8 w-8"
                                    >
                                        <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ボックスタブ */}
                    <div className="flex items-center">
                        <span className="text-sm font-semibold shrink-0">{t('box.label')}:</span>
                    </div>
                    <div className="flex items-center min-h-[2.5rem] w-full max-w-full overflow-hidden">
                        <div className="relative flex items-center w-full max-w-full" ref={boxTabsContainerRef}>
                            <div className="flex overflow-hidden" style={{ width: hasMoreBoxes ? 'calc(100% - 48px)' : '100%' }}>
                                <Tabs value={selectedBoxId} onValueChange={handleBoxChange}>
                                    <TabsList
                                        className="flex gap-0.5 bg-neutral-200 dark:bg-neutral-800"
                                        style={{
                                            width: 'fit-content',
                                            maxWidth: '100%',
                                        }}
                                    >
                                        <TabsTrigger value="all" className="justify-start text-left w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">{t('common.all')}</TabsTrigger>
                                        {selectedCategoryId !== 'all' && (
                                            <TabsTrigger value={UNCLASSIFIED_ID} className="justify-start text-left w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">{t('common.unclassified')}</TabsTrigger>
                                        )}
                                        {displayedBoxes.map((box) => (
                                            <TabsTrigger key={box.id} value={box.id} className="w-[7rem] justify-start text-left shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">
                                                {box.name}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </div>
                            {hasMoreBoxes && (
                                <div className="absolute right-0 flex items-center justify-center bg-background" style={{ width: 48, height: '100%' }}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectBoxModalOpen(true)}
                                        className="shrink-0 h-8 w-8"
                                    >
                                        <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden p-0">
                <div className="flex items-center justify-end p-3 gap-2">
                    <Button onClick={handleNavigate} variant="secondary">
                        <ArrowRightEndOnRectangleIcon className="h-5 w-5 mr-2" />
                        {t('common.moveToBox')}
                    </Button>
                    <Card className="min-w-[5rem] py-2 bg-green-700 text-white">
                        <CardHeader className="p-0">
                            <CardTitle className="text-sm text-center flex items-center justify-center gap-1">
                                <CheckCircleIcon className="h-6 w-6" />
                                : {flattenedAndFilteredReviews.filter(r => r.is_completed).length}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card className="min-w-[5rem] py-2">
                        <CardHeader className="p-0">
                            <CardTitle className="text-sm text-center flex items-center justify-center gap-1">
                                <XCircleIcon className="h-6 w-6" />
                                : {flattenedAndFilteredReviews.filter(r => !r.is_completed).length}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                <Card className="flex-1 min-h-0 p-0 py-0">

                    <CardContent className="p-0 h-full">
                        <ScrollArea className="w-full h-full rounded-xl pb-3 pr-3">
                            {isLoading && !flattenedAndFilteredReviews.length ? (
                                <TableSkeleton />
                            ) : (
                                <DataTable
                                    columns={columns}
                                    data={flattenedAndFilteredReviews}
                                    fixedColumns={4}
                                    maxHeight="100%"
                                    enablePagination={false}
                                    tableWidth={tableWidth}
                                    resizableColumn={{
                                        index: 1, // 復習物名列（0: 状態, 1: 復習物名）
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

                {/* 詳細モーダル・編集モーダル */}
                {detailItem && (
                    <ItemDetailModal
                        isOpen={!!detailItem}
                        onClose={() => setDetailItem(null)}
                        item={{
                            item_id: detailItem.item_id,
                            name: detailItem.item_name,
                            detail: detailItem.detail,
                            // 必須フィールドはダミー値で埋める（詳細表示のみなのでOK）
                            user_id: '',
                            category_id: detailItem.category_id,
                            box_id: detailItem.box_id,
                            pattern_id: null,
                            learned_date: '',
                            is_finished: false,
                            registered_at: '',
                            edited_at: '',
                            review_dates: [],
                        }}
                    />
                )}

                {editingReviewDate && (
                    <EditReviewDateModal
                        isOpen={!!editingReviewDate}
                        onClose={() => setEditingReviewDate(null)}
                        data={editingReviewDate}
                    />
                )}

                <SelectCategoryModal
                    isOpen={isSelectCategoryModalOpen}
                    onClose={() => setSelectCategoryModalOpen(false)}
                    onSelect={(category) => { handleCategoryChange(category.id); setSelectCategoryModalOpen(false); }}
                />
                <SelectBoxModal
                    isOpen={isSelectBoxModalOpen}
                    onClose={() => setSelectBoxModalOpen(false)}
                    onSelect={(box) => { handleBoxChange(box.id); setSelectBoxModalOpen(false); }}
                    categoryId={selectedCategoryId !== 'all' ? selectedCategoryId : undefined}
                />
            </div>
        </div>
    );
};

export default TodaysReviewPage;