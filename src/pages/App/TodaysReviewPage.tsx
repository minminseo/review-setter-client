import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { ArrowRightEndOnRectangleIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon, PencilIcon } from '@heroicons/react/24/outline';
import { MoreHorizontal } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

// API & Store & Types
import {
    fetchTodaysReviews, // フィルター機能を持つように変更したと仮定
    completeReviewDate,
    incompleteReviewDate
} from '@/api/itemApi';
import { fetchCategories } from '@/api/categoryApi';
import { fetchBoxes } from '@/api/boxApi'; // ボックス取得APIをインポート
import { useItemStore, useCategoryStore, useBoxStore, usePatternStore } from '@/store';
import { DailyReviewDate, GetDailyReviewDatesResponse } from '@/types';
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
                    item_id: rd.item_id, // ← review_date_idではなく本来のitem_idをセット
                    target_weight: box.target_weight
                }))
            );
        });
        allReviews.push(
            ...category.unclassified_daily_review_dates_by_category.map(rd => ({
                ...rd,
                item_id: rd.item_id, // ← ここも修正
                box_id: null,
            }))
        );
    });
    allReviews.push(
        ...data.daily_review_dates_grouped_by_user.map(rd => ({
            ...rd,
            item_id: rd.item_id ?? rd.review_date_id, // item_idがなければreview_date_idを暫定的にセット
            category_id: null,
            box_id: null,
        }))
    );
    return allReviews;
};

/**
 * 今日の復習項目を一覧表示し、完了操作を行うためのページ
 */
const TodaysReviewPage = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { categories, setCategories } = useCategoryStore();
    const { boxesByCategoryId, setBoxesForCategory } = useBoxStore();
    const { todaysReviews: zustandTodaysReviews, setTodaysReviews } = useItemStore();
    const { patterns } = usePatternStore();

    // フィルターの状態管理
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('all');
    const [selectedBoxId, setSelectedBoxId] = React.useState<string>('all');

    // モーダルの状態管理
    const [isSelectCategoryModalOpen, setSelectCategoryModalOpen] = React.useState(false);
    const [isSelectBoxModalOpen, setSelectBoxModalOpen] = React.useState(false);

    // タブのレスポンシブ表示制御
    const categoryTabsContainerRef = useRef<HTMLDivElement>(null);
    const boxTabsContainerRef = useRef<HTMLDivElement>(null);
    const [maxCategoryTabs, setMaxCategoryTabs] = useState<number>(7);
    const [maxBoxTabs, setMaxBoxTabs] = useState<number>(7);

    // 詳細・編集用の状態
    const [detailItem, setDetailItem] = React.useState<DailyReviewDate | null>(null);
    const [editingReviewDate, setEditingReviewDate] = React.useState<DailyReviewDate | null>(null);

    // --- データ取得 (React Query) ---
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

    // --- データ取得後の副作用 (ストアの更新) ---
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

    // --- データ加工 ---
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

            // カテゴリーが 'all' でなく、ボックスが 'all' の場合、未分類ボックスも含む
            if (selectedCategoryId !== 'all' && selectedBoxId === 'all') {
                return categoryMatch;
            }

            return categoryMatch && boxMatch;
        });
    }, [reviewItems, selectedCategoryId, selectedBoxId]);


    // --- データ操作 (Mutation) ---
    const createMutationOptions = (_: boolean) => ({
        onSuccess: (_: any, _vars: any) => {
            toast.success("状態を更新しました。");
            queryClient.invalidateQueries({ queryKey: ['todaysReviews', selectedCategoryId, selectedBoxId] });
            queryClient.invalidateQueries({ queryKey: ['summary'] });
        },
        onError: (err: any) => toast.error(`更新に失敗しました: ${err.message}`),
    });

    const completeMutation = useMutation({ mutationFn: completeReviewDate, ...createMutationOptions(true) });
    const incompleteMutation = useMutation({ mutationFn: incompleteReviewDate, ...createMutationOptions(false) });

    // --- テーブルの列定義 ---
    const columns = React.useMemo<ColumnDef<DailyReviewDate>[]>(() => [
        // 状態カラム（完了/未完了）
        {
            id: 'is_completed',
            header: '状態',
            cell: ({ row }) => {
                const isCompleted = row.original.is_completed;
                return isCompleted ? (
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
                        取消
                    </Button>
                ) : (
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
                        完了
                    </Button>
                );
            },
            size: 60,
        },
        // 操作カラム（歯車アイコン）
        {
            id: 'actions',
            header: '操作',
            cell: ({ row }) => (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingReviewDate(row.original)}>
                    <PencilIcon className="h-5 w-5" />
                </Button>
            ),
            size: 60,
        },
        // item_name（復習物名）
        {
            accessorKey: 'item_name',
            header: '復習物名',
            cell: ({ row }) => <NameCell name={row.original.item_name} />, // 省略表示＋ツールチップ
        },
        // 詳細カラム（情報アイコン）
        {
            id: 'detail',
            header: '詳細',
            cell: ({ row }) => (
                <Button variant="ghost" size="icon" onClick={() => setDetailItem(row.original)}>
                    <DocumentTextIcon className="h-5 w-5" />
                </Button>
            ),
            size: 60,
        },
        // 重さカラム（target_weight）
        {
            id: 'target_weight',
            header: '重さ',
            cell: ({ row }) => {
                // box_idがあればboxのpattern_idから、なければcategory_idやitem_idから推測
                const tw = row.original.target_weight;
                if (tw) return tw;
                // fallback: patternsからitem_idやbox_idで探す場合はここで拡張
                return '-';
            },
        },
        // ステップカラム
        {
            accessorKey: 'step_number',
            header: 'ステップ',
            cell: ({ row }) => row.original.step_number,
        },
        // 学習日カラム
        {
            id: 'learned_date',
            header: '学習日',
            cell: ({ row }) => row.original.learned_date || '-',

        },
        // prevカラム
        {
            id: 'prev',
            header: 'prev',
            cell: ({ row }) => row.original.prev_scheduled_date || '-',
        },
        // currentカラム
        {
            id: 'current',
            header: 'current',
            cell: ({ row }) => row.original.scheduled_date || '-',
        },
        // nextカラム
        {
            id: 'next',
            header: 'next',
            cell: ({ row }) => row.original.next_scheduled_date || '-',
        },
    ], [completeMutation, incompleteMutation, patterns]);

    // --- イベントハンドラ ---
    const handleCategoryChange = (newCategoryId: string) => {
        setSelectedCategoryId(newCategoryId);
        setSelectedBoxId('all'); // カテゴリー変更時はボックス選択をリセット
    };

    const handleBoxChange = (newBoxId: string) => {
        setSelectedBoxId(newBoxId);
    };

    const handleNavigate = () => {
        if (selectedCategoryId === 'all') navigate('/');
        else if (selectedBoxId === 'all') navigate(`/categories/${selectedCategoryId}`);
        else navigate(`/categories/${selectedCategoryId}/boxes/${selectedBoxId}`);
    };

    // タブの最大表示数を計算（レスポンシブ）
    useEffect(() => {
        const calcTabs = () => {
            // タブ1つの最小幅（rem単位→px換算、1rem=16px想定）
            const tabMinWidth = 112; // 7rem * 16px
            const moreButtonWidth = 40; // MoreHorizontalボタンの幅

            if (categoryTabsContainerRef.current) {
                const containerWidth = categoryTabsContainerRef.current.offsetWidth;
                const availableWidth = containerWidth * 0.95 - moreButtonWidth; // 95%の領域からMoreボタン幅を除く
                const fixedTabsWidth = 2 * tabMinWidth; // 「全て」「未分類」の固定タブ幅
                const remainingWidth = availableWidth - fixedTabsWidth;
                const maxDynamicTabs = Math.max(0, Math.floor(remainingWidth / tabMinWidth));
                setMaxCategoryTabs(maxDynamicTabs);
            }

            if (boxTabsContainerRef.current) {
                const containerWidth = boxTabsContainerRef.current.offsetWidth;
                const availableWidth = containerWidth * 0.95 - moreButtonWidth;
                const fixedTabsCount = selectedCategoryId === 'all' ? 1 : 2; // 「全て」のみ or 「全て」「未分類」
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

    // --- 表示用データ ---
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
                <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: "今日の復習" }]} />
                <div
                    className="grid grid-cols-[auto_1fr] grid-rows-2 gap-x-4 gap-y-2 items-stretch w-full max-w-full"
                    style={{ minWidth: 'min-content' }}
                >
                    {/* カテゴリーラベル */}
                    <div className="flex items-center">
                        <span className="text-sm font-semibold shrink-0">カテゴリー:</span>
                    </div>
                    {/* カテゴリータブ */}
                    <div className="flex items-center min-h-[2.5rem] w-full max-w-full overflow-hidden">
                        <div className="relative flex items-center w-full max-w-full" ref={categoryTabsContainerRef}>
                            <div className="flex overflow-hidden" style={{ width: hasMoreCategories ? 'calc(100% - 48px)' : '100%' }}>
                                <Tabs value={selectedCategoryId} onValueChange={handleCategoryChange}>
                                    <TabsList className="flex gap-0.5 bg-neutral-200 dark:bg-neutral-800" style={{ width: 'fit-content', maxWidth: '100%' }}>
                                        <TabsTrigger value="all" className="justify-start text-left min-w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">全て</TabsTrigger>
                                        <TabsTrigger value={UNCLASSIFIED_ID} className="justify-start text-left min-w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">未分類</TabsTrigger>
                                        {displayedCategories.map((cat) => (
                                            <TabsTrigger key={cat.id} value={cat.id} className="min-w-[7rem] justify-start text-left shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">
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
                    {/* ボックスラベル */}
                    <div className="flex items-center">
                        <span className="text-sm font-semibold shrink-0">ボックス:</span>
                    </div>
                    {/* ボックスタブ */}
                    <div className="flex items-center min-h-[2.5rem] w-full max-w-full overflow-hidden">
                        <div className="relative flex items-center w-full max-w-full" ref={boxTabsContainerRef}>
                            <div className="flex overflow-hidden" style={{ width: hasMoreBoxes ? 'calc(100% - 48px)' : '100%' }}>
                                <Tabs value={selectedBoxId} onValueChange={handleBoxChange}>
                                    <TabsList
                                        className="flex gap-0.5 bg-neutral-200 dark:bg-neutral-800"
                                        style={{
                                            width: 'fit-content',
                                            maxWidth: '100%',
                                            borderRadius: '0.75rem',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <TabsTrigger value="all" className="justify-start text-left min-w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">全て</TabsTrigger>
                                        {selectedCategoryId !== 'all' && (
                                            <TabsTrigger value={UNCLASSIFIED_ID} className="justify-start text-left min-w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">未分類</TabsTrigger>
                                        )}
                                        {displayedBoxes.map((box) => (
                                            <TabsTrigger key={box.id} value={box.id} className="min-w-[7rem] justify-start text-left shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">
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

            <div className="flex-1 flex flex-col overflow-hidden p-4 pt-0">
                <div className="flex items-center justify-end p-3 gap-2">
                    <Button onClick={handleNavigate} variant="secondary">
                        <ArrowRightEndOnRectangleIcon className="h-5 w-5 mr-2" />
                        このレイヤーへ移動
                    </Button>
                    <Card className="min-w-[5rem] py-2 bg-green-900">
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
                <Card className="flex-1">
                    <CardContent className="pt-6 h-full">
                        {isLoading && !flattenedAndFilteredReviews.length ? (
                            <TableSkeleton />
                        ) : (
                            <DataTable columns={columns} data={flattenedAndFilteredReviews} />
                        )}
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
                {editingReviewDate && (() => {
                    // zustandTodaysReviewsから該当itemを検索
                    let item: any = null;
                    let reviewDate: any = null;
                    if (zustandTodaysReviews) {
                        // 1. カテゴリー・ボックス内
                        for (const category of zustandTodaysReviews.categories) {
                            for (const box of category.boxes) {
                                for (const rd of box.review_dates) {
                                    if (rd.review_date_id === editingReviewDate.review_date_id) {
                                        const safeLearned = '1970-01-01';
                                        const safeScheduled = rd.scheduled_date || '1970-01-01';
                                        const safeInitial = rd.scheduled_date || '1970-01-01';
                                        item = {
                                            item_id: rd.item_id,
                                            name: rd.item_name,
                                            detail: rd.detail,
                                            user_id: '',
                                            category_id: rd.category_id,
                                            box_id: rd.box_id,
                                            pattern_id: null,
                                            learned_date: safeLearned,
                                            is_finished: false,
                                            registered_at: '',
                                            edited_at: '',
                                            review_dates: [{ ...rd, scheduled_date: safeScheduled, initial_scheduled_date: safeInitial }],
                                        };
                                        reviewDate = { ...rd, scheduled_date: safeScheduled, initial_scheduled_date: safeInitial };
                                    }
                                }
                            }
                            // 2. 未分類ボックス
                            for (const rd of category.unclassified_daily_review_dates_by_category) {
                                const safeLearned = '1970-01-01';
                                const safeScheduled = rd.scheduled_date || '1970-01-01';
                                const safeInitial = rd.scheduled_date || '1970-01-01';
                                if (rd.review_date_id === editingReviewDate.review_date_id) {
                                    item = {
                                        item_id: rd.item_id,
                                        name: rd.item_name,
                                        detail: rd.detail,
                                        user_id: '',
                                        category_id: rd.category_id,
                                        box_id: null,
                                        pattern_id: null,
                                        learned_date: safeLearned,
                                        is_finished: false,
                                        registered_at: '',
                                        edited_at: '',
                                        review_dates: [{ ...rd, scheduled_date: safeScheduled, initial_scheduled_date: safeInitial }],
                                    };
                                    reviewDate = { ...rd, scheduled_date: safeScheduled, initial_scheduled_date: safeInitial };
                                }
                            }
                        }
                        // 3. ユーザー直下
                        for (const rd of zustandTodaysReviews.daily_review_dates_grouped_by_user) {
                            const safeLearned = '1970-01-01';
                            const safeScheduled = rd.scheduled_date || '1970-01-01';
                            const safeInitial = rd.scheduled_date || '1970-01-01';
                            if (rd.review_date_id === editingReviewDate.review_date_id) {
                                item = {
                                    item_id: rd.item_id,
                                    name: rd.item_name,
                                    detail: rd.detail,
                                    user_id: '',
                                    category_id: null,
                                    box_id: null,
                                    pattern_id: null,
                                    learned_date: safeLearned,
                                    is_finished: false,
                                    registered_at: '',
                                    edited_at: '',
                                    review_dates: [{ ...rd, scheduled_date: safeScheduled, initial_scheduled_date: safeInitial }],
                                };
                                reviewDate = { ...rd, scheduled_date: safeScheduled, initial_scheduled_date: safeInitial };
                            }
                        }
                    }
                    return (
                        <EditReviewDateModal
                            isOpen={!!editingReviewDate}
                            onClose={() => setEditingReviewDate(null)}
                            data={item && reviewDate ? { item, reviewDate } : null}
                        />
                    );
                })()}

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