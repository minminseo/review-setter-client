import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
// import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowRightEndOnRectangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

// API & Store & Types
import { fetchTodaysReviews, completeReviewDate, incompleteReviewDate } from '@/api/itemApi';
import { fetchCategories } from '@/api/categoryApi';
import { useItemStore, useCategoryStore } from '@/store';
import { DailyReviewDate, GetDailyReviewDatesResponse /*GetCategoryOutput*/ } from '@/types';
import { UNCLASSIFIED_ID } from '@/constants';

// Shared & UI Components
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'; // TabsListとTabsTriggerをインポート
import { MoreHorizontal } from 'lucide-react'; // MoreHorizontalアイコンをインポート

// Modals
import { SelectCategoryModal } from '@/components/modals/SelectCategoryModal'; // SelectCategoryModalをインポート
import { SelectBoxModal } from '@/components/modals/SelectBoxModal'; // SelectBoxModalをインポート

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
    const { todaysReviews, setTodaysReviews } = useItemStore();


    // フィルターの状態管理
    const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
    const [selectedBox, setSelectedBox] = React.useState<string>('all');
    const [isSelectCategoryModalOpen, setSelectCategoryModalOpen] = React.useState(false); //
    const [isSelectBoxModalOpen, setSelectBoxModalOpen] = React.useState(false); //


    // --- データ取得 ---
    // 1. カテゴリー一覧 (フィルタータブ用)
    const { data: fetchedCategories, isSuccess: catSuccess } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
    // 2. 今日の復習全件
    const { data: fetchedReviews, isLoading, isSuccess: reviewsSuccess } = useQuery({ queryKey: ['todaysReviews'], queryFn: fetchTodaysReviews });

    // --- データ取得後の副作用 (ストアの更新) ---
    React.useEffect(() => {
        if (catSuccess && fetchedCategories) setCategories(fetchedCategories);
    }, [catSuccess, fetchedCategories, setCategories]);
    React.useEffect(() => {
        if (reviewsSuccess && fetchedReviews) setTodaysReviews(fetchedReviews);
    }, [reviewsSuccess, fetchedReviews, setTodaysReviews]);


    // --- データ加工とフィルタリング ---
    const allFlattenedReviews = React.useMemo(() => flattenTodaysReviews(todaysReviews ?? undefined), [todaysReviews]);

    const filteredReviews = React.useMemo(() => {
        // 指示書通り、クライアントサイドでフィルタリングを行う
        let items = allFlattenedReviews;
        if (selectedCategory === UNCLASSIFIED_ID) {
            items = items.filter(item => item.category_id === null);
        } else if (selectedCategory !== 'all') {
            items = items.filter(item => item.category_id === selectedCategory);
        }

        if (selectedBox !== 'all') {
            items = items.filter(item => item.box_id === selectedBox);
        }
        return items;
    }, [allFlattenedReviews, selectedCategory, selectedBox]);


    // --- データ操作 (Mutation) ---
    const createMutationOptions = (isCompleting: boolean) => ({
        onSuccess: (_: any, variables: any) => {
            toast.success("状態を更新しました。");

            // 楽観的UI更新: 即座にZustandストアを更新
            if (todaysReviews) {
                const updatedReviews = { ...todaysReviews };

                // レビュー日の完了状態を即座に更新
                updatedReviews.categories.forEach(category => {
                    category.boxes.forEach(box => {
                        box.review_dates.forEach(reviewDate => {
                            if (reviewDate.review_date_id === variables.reviewDateId) {
                                reviewDate.is_completed = isCompleting;
                            }
                        });
                    });
                    category.unclassified_daily_review_dates_by_category.forEach(reviewDate => {
                        if (reviewDate.review_date_id === variables.reviewDateId) {
                            reviewDate.is_completed = isCompleting;
                        }
                    });
                });
                updatedReviews.daily_review_dates_grouped_by_user.forEach(reviewDate => {
                    if (reviewDate.review_date_id === variables.reviewDateId) {
                        reviewDate.is_completed = isCompleting;
                    }
                });

                setTodaysReviews(updatedReviews);
            }

            // バックグラウンドでデータ再取得
            queryClient.invalidateQueries({ queryKey: ['todaysReviews'] });
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
        // ... (他の列定義: 詳細、重さ、ステップなど)
    ], [completeMutation, incompleteMutation]);

    // --- 動的UIロジック ---
    const boxesForSelectedCategory = React.useMemo(() => {
        if (!todaysReviews || selectedCategory === 'all' || selectedCategory === UNCLASSIFIED_ID) return [];
        const categoryData = todaysReviews.categories.find(c => c.category_id === selectedCategory);
        return categoryData?.boxes || [];
    }, [todaysReviews, selectedCategory]);

    const handleNavigate = () => {
        if (selectedCategory === 'all') navigate('/');
        else if (selectedBox === 'all') navigate(`/categories/${selectedCategory}`);
        else navigate(`/categories/${selectedCategory}/boxes/${selectedBox}`);
    };

    // 表示するカテゴリータブを制限
    const displayedCategories = categories.slice(0, 7); // 最大7つまで表示
    const hasMoreCategories = categories.length > 7; // 8つ以上あれば「その他」を表示

    // 表示するボックスタブを制限
    const displayedBoxes = boxesForSelectedCategory.slice(0, 7); // 最大7つまで表示
    const hasMoreBoxes = boxesForSelectedCategory.length > 7; // 8つ以上あれば「その他」を表示


    return (
        <div className="h-screen flex flex-col overflow-hidden ">
            <div className="flex-shrink-0 space-y-4 ">
                <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: "今日の復習" }]} />
                <div
                    className="grid grid-cols-[auto_1fr] grid-rows-2 gap-x-4 gap-y-2 items-stretch w-fit"
                    style={{ minWidth: 'min-content' }}
                >
                    {/* カテゴリーラベル */}
                    <div className="flex items-center">
                        <span className="text-sm font-semibold shrink-0">カテゴリー:</span>
                    </div>
                    {/* カテゴリータブ */}
                    <div className="flex items-center min-h-[2.5rem]">
                        <div className="relative flex items-center">
                            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                                <TabsList
                                    className="flex"
                                    style={{
                                        minWidth: `${(2 + displayedCategories.length) * 6}rem`,
                                        width: 'auto',
                                    }}
                                >
                                    <TabsTrigger value="all">全て</TabsTrigger>
                                    <TabsTrigger value={UNCLASSIFIED_ID}>未分類</TabsTrigger>
                                    {displayedCategories.map(cat => (
                                        <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                            {hasMoreCategories && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectCategoryModalOpen(true)}
                                    className="ml-1 shrink-0 h-8 w-8"
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                    {/* ボックスラベル */}
                    <div className="flex items-center">
                        <span className="text-sm font-semibold shrink-0">ボックス:</span>
                    </div>
                    {/* ボックスタブ */}
                    <div className="flex items-center min-h-[2.5rem]">
                        <div className="relative flex items-center">
                            <Tabs value={selectedBox} onValueChange={setSelectedBox}>
                                <TabsList
                                    className="flex"
                                    style={{
                                        minWidth: `${(1 + displayedBoxes.length) * 6}rem`,
                                        width: 'auto',
                                    }}
                                >
                                    <TabsTrigger value="all">全て</TabsTrigger>
                                    {displayedBoxes.map(box => (
                                        <TabsTrigger key={box.box_id} value={box.box_id}>{box.box_name}</TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                            {hasMoreBoxes && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSelectBoxModalOpen(true)}
                                    className="ml-1 shrink-0 h-8 w-8"
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden p-4 pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end p-3 gap-2">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                        <Button
                            onClick={handleNavigate}
                            className="w-full sm:w-auto"
                            variant="secondary"
                            size="lg"
                        >
                            <ArrowRightEndOnRectangleIcon className="h-5 w-5" />
                        </Button>
                        <Card className="w-full sm:w-10 min-w-[5rem] max-w-xs py-2 bg-green-900">
                            <CardHeader className="p-0">
                                <CardTitle className="text-sm whitespace-nowrap text-center flex items-center justify-center gap-1">
                                    <CheckCircleIcon className="h-6 w-6 " /> {/* 青色に上書き */}
                                    : {filteredReviews.filter(r => r.is_completed).length}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="w-full sm:w-10 min-w-[5rem] max-w-xs py-2">
                            <CardHeader className="p-0">
                                <CardTitle className="text-sm whitespace-nowrap text-center flex items-center justify-center gap-1">
                                    <XCircleIcon className="h-6 w-6" />
                                    : {filteredReviews.filter(r => !r.is_completed).length}
                                </CardTitle>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        {isLoading ? <TableSkeleton /> : <DataTable columns={columns} data={filteredReviews} />}
                    </CardContent>
                </Card>
            </div>

            {/* モーダルコンポーネントを追加 */}
            <SelectCategoryModal isOpen={isSelectCategoryModalOpen} onClose={() => setSelectCategoryModalOpen(false)} onSelect={(category) => { setSelectedCategory(category.id); setSelectCategoryModalOpen(false); }} /> {/* */}
            <SelectBoxModal isOpen={isSelectBoxModalOpen} onClose={() => setSelectBoxModalOpen(false)} onSelect={(box) => { setSelectedBox(box.id); setSelectBoxModalOpen(false); }} categoryId={selectedCategory === 'all' ? undefined : selectedCategory} /> {/* */}

        </div>
    );
};

export default TodaysReviewPage;