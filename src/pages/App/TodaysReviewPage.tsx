import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
// import { format } from 'date-fns';
import { toast } from 'sonner';

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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    const mutationOptions = {
        onSuccess: () => {
            toast.success("状態を更新しました。");
            queryClient.invalidateQueries({ queryKey: ['todaysReviews'] });
        },
        onError: (err: any) => toast.error(`更新に失敗しました: ${err.message}`),
    };
    const completeMutation = useMutation({ mutationFn: completeReviewDate, ...mutationOptions });
    const incompleteMutation = useMutation({ mutationFn: incompleteReviewDate, ...mutationOptions });

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

    return (
        <div className="space-y-4">
            <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: "今日の復習" }]} />
            <div className="flex justify-between items-start">
                <div className='space-y-2'>
                    <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                        <TabsList>
                            <TabsTrigger value="all">全て</TabsTrigger>
                            <TabsTrigger value={UNCLASSIFIED_ID}>未分類</TabsTrigger>
                            {categories.map(cat => <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>)}
                        </TabsList>
                    </Tabs>
                    <Tabs value={selectedBox} onValueChange={setSelectedBox}>
                        <TabsList>
                            <TabsTrigger value="all">全て</TabsTrigger>
                            {boxesForSelectedCategory.map(box => <TabsTrigger key={box.box_id} value={box.box_id}>{box.box_name}</TabsTrigger>)}
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex items-center gap-4">
                    <Card>
                        <CardHeader className="p-3">
                            <CardDescription>このレイヤーの完了状況</CardDescription>
                            <CardTitle className="text-lg">✔: {filteredReviews.filter(r => r.is_completed).length} / 残: {filteredReviews.filter(r => !r.is_completed).length}</CardTitle>
                        </CardHeader>
                    </Card>
                    <Button onClick={handleNavigate}>このレイヤーへ移動</Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? <TableSkeleton /> : <DataTable columns={columns} data={filteredReviews} />}
                </CardContent>
            </Card>
        </div>
    );
};

export default TodaysReviewPage;