import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { ArrowRightEndOnRectangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { MoreHorizontal } from 'lucide-react';

// API & Store & Types
import {
    fetchTodaysReviews, // フィルター機能を持つように変更したと仮定
    completeReviewDate,
    incompleteReviewDate
} from '@/api/itemApi';
import { fetchCategories } from '@/api/categoryApi';
import { fetchBoxes } from '@/api/boxApi'; // ボックス取得APIをインポート
import { useItemStore, useCategoryStore, useBoxStore } from '@/store';
import { DailyReviewDate, GetDailyReviewDatesResponse, GetCategoryOutput, GetBoxOutput } from '@/types';
import { UNCLASSIFIED_ID } from '@/constants';

// Shared & UI Components
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Modals
import { SelectCategoryModal } from '@/components/modals/SelectCategoryModal';
import { SelectBoxModal } from '@/components/modals/SelectBoxModal';

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
                    ...rd, item_id: rd.review_date_id,
                    target_weight: box.target_weight
                }))
            );
        });
        allReviews.push(
            ...category.unclassified_daily_review_dates_by_category.map(rd => ({
                ...rd,
                item_id: rd.review_date_id,
                box_id: null,
            }))
        );
    });
    allReviews.push(
        ...data.daily_review_dates_grouped_by_user.map(rd => ({
            ...rd,
            item_id: rd.review_date_id,
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

    // フィルターの状態管理
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('all');
    const [selectedBoxId, setSelectedBoxId] = React.useState<string>('all');

    // モーダルの状態管理
    const [isSelectCategoryModalOpen, setSelectCategoryModalOpen] = React.useState(false);
    const [isSelectBoxModalOpen, setSelectBoxModalOpen] = React.useState(false);

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
        queryFn: () => fetchTodaysReviews({
            categoryId: selectedCategoryId === 'all' || selectedCategoryId === UNCLASSIFIED_ID ? null : selectedCategoryId,
            boxId: selectedBoxId === 'all' || selectedBoxId === UNCLASSIFIED_ID ? null : selectedBoxId,
        }),
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
    const createMutationOptions = (isCompleting: boolean) => ({
        onSuccess: (_: any, variables: any) => {
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
        {
            id: 'is_completed', header: '完/未', cell: ({ row }) => (
                <Checkbox
                    checked={row.original.is_completed}
                    onCheckedChange={(checked) => {
                        const { item_id, review_date_id, step_number } = row.original;
                        const mutationData = { itemId: item_id, reviewDateId: review_date_id, data: { step_number } };
                        checked ? completeMutation.mutate(mutationData) : incompleteMutation.mutate(mutationData);
                    }}
                />
            )
        },
        { accessorKey: 'item_name', header: '復習物名' },
        // ... 他の列定義
    ], [completeMutation, incompleteMutation]);

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

    // --- 表示用データ ---
    const boxesForSelectedCategory = React.useMemo(() => {
        if (!selectedCategoryId || selectedCategoryId === 'all' || selectedCategoryId === UNCLASSIFIED_ID) return [];
        return boxesByCategoryId[selectedCategoryId] || [];
    }, [boxesByCategoryId, selectedCategoryId]);

    const displayedCategories = categories.slice(0, 5);
    const hasMoreCategories = categories.length > 5;
    const displayedBoxes = boxesForSelectedCategory.slice(0, 5);
    const hasMoreBoxes = boxesForSelectedCategory.length > 5;

    return (
        <div className="h-screen flex flex-col overflow-hidden ">
            <div className="flex-shrink-0 space-y-4 p-4 border-b">
                <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: "今日の復習" }]} />
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">カテゴリー:</span>
                    <Tabs value={selectedCategoryId} onValueChange={handleCategoryChange}>
                        <TabsList>
                            <TabsTrigger value="all">全て</TabsTrigger>
                            <TabsTrigger value={UNCLASSIFIED_ID}>未分類</TabsTrigger>
                            {displayedCategories.map(cat => (
                                <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                    {hasMoreCategories && (
                        <Button variant="ghost" size="icon" onClick={() => setSelectCategoryModalOpen(true)}>
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">ボックス:</span>
                    <Tabs value={selectedBoxId} onValueChange={handleBoxChange}>
                        <TabsList>
                            <TabsTrigger value="all">全て</TabsTrigger>
                            {selectedCategoryId !== 'all' && <TabsTrigger value={UNCLASSIFIED_ID}>未分類</TabsTrigger>}
                            {displayedBoxes.map(box => (
                                <TabsTrigger key={box.id} value={box.id}>{box.name}</TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                    {hasMoreBoxes && (
                        <Button variant="ghost" size="icon" onClick={() => setSelectBoxModalOpen(true)}>
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    )}
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
            </div>

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
    );
};

export default TodaysReviewPage;