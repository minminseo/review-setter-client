import * as React from 'react';
import { useQueries } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useCategoryStore } from '@/store';
import {
    fetchCategories
} from '@/api/categoryApi';
import {
    fetchTotalDailyReviewCount,
    fetchUnclassifiedItemCount,
    fetchItemCountByBox,
    fetchUnclassifiedItemCountByCategory,
    fetchDailyReviewCountByBox,
    fetchDailyUnclassifiedReviewCountByCategory
} from '@/api/itemApi';
import { GetCategoryOutput, ItemCountGroupedByBoxResponse, UnclassifiedItemCountGroupedByCategoryResponse, DailyCountGroupedByBoxResponse, UnclassifiedDailyDatesCountGroupedByCategoryResponse } from '@/types';

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';

// Modals
import { CreateCategoryModal } from '@/components/modals/CreateCategoryModal';
import { EditCategoryModal } from '@/components/modals/EditCategoryModal';
import { CreateBoxModal } from '@/components/modals/CreateBoxModal';
import { UNCLASSIFIED_ID } from '@/constants';

/**
 * ログイン後のホームページ（ダッシュボード）。
 * 今日の復習数、カテゴリー一覧、各種サマリーを表示する。
 */
const HomePage = () => {
    const navigate = useNavigate();
    const { setCategories } = useCategoryStore();

    // モーダルの開閉状態を一元管理
    const [isCreateCategoryModalOpen, setCreateCategoryModalOpen] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<GetCategoryOutput | null>(null);
    const [creatingBoxInCategory, setCreatingBoxInCategory] = React.useState<GetCategoryOutput | null>(null);

    // useQueriesを使い、ホームページに必要なデータを並列で取得
    const results = useQueries({
        queries: [
            { queryKey: ['categories'], queryFn: fetchCategories },
            { queryKey: ['summary', 'totalDailyReviewCount'], queryFn: fetchTotalDailyReviewCount },
            { queryKey: ['summary', 'unclassifiedItemCount'], queryFn: fetchUnclassifiedItemCount },
            { queryKey: ['summary', 'itemCountByBox'], queryFn: fetchItemCountByBox },
            { queryKey: ['summary', 'unclassifiedItemCountByCategory'], queryFn: fetchUnclassifiedItemCountByCategory },
            { queryKey: ['summary', 'dailyReviewCountByBox'], queryFn: fetchDailyReviewCountByBox },
            { queryKey: ['summary', 'dailyUnclassifiedReviewCountByCategory'], queryFn: fetchDailyUnclassifiedReviewCountByCategory },
        ],
    });

    const isLoading = results.some(query => query.isLoading);

    // 各クエリの結果を分割代入
    const [
        categoriesQuery,
        totalDailyReviewCountQuery,
        unclassifiedItemCountQuery,
        itemCountByBoxQuery,
        unclassifiedItemCountByCategoryQuery,
        dailyReviewCountByBoxQuery,
        dailyUnclassifiedReviewCountByCategoryQuery,
    ] = results;

    // カテゴリーデータ取得後、Zustandストアにも保存
    React.useEffect(() => {
        if (categoriesQuery.isSuccess) {
            setCategories(categoriesQuery.data);
        }
    }, [categoriesQuery.isSuccess, categoriesQuery.data, setCategories]);

    // 取得したデータを基に、UI表示用にカテゴリーごとの統計情報を計算する
    const categoriesWithStats = React.useMemo(() => {
        if (!categoriesQuery.data || !itemCountByBoxQuery.data || !dailyReviewCountByBoxQuery.data) {
            return [];
        }

        const itemCountByBox = itemCountByBoxQuery.data as ItemCountGroupedByBoxResponse[];
        const dailyCountByBox = dailyReviewCountByBoxQuery.data as DailyCountGroupedByBoxResponse[];
        const unclassifiedItemCount = unclassifiedItemCountByCategoryQuery.data as UnclassifiedItemCountGroupedByCategoryResponse[];
        const unclassifiedDailyCount = dailyUnclassifiedReviewCountByCategoryQuery.data as UnclassifiedDailyDatesCountGroupedByCategoryResponse[];

        return categoriesQuery.data.map(category => {
            // カテゴリーに属するボックスの総アイテム数を計算
            const totalItems = itemCountByBox
                .filter(c => c.category_id === category.id)
                .reduce((sum, current) => sum + current.count, 0);
            const unclassifiedItems = unclassifiedItemCount.find(c => c.category_id === category.id)?.count || 0;

            // カテゴリーに属するボックスの今日の復習数を計算
            const dailyReviews = dailyCountByBox
                .filter(c => c.category_id === category.id)
                .reduce((sum, current) => sum + current.count, 0);
            const unclassifiedDailyReviews = unclassifiedDailyCount.find(c => c.category_id === category.id)?.count || 0;

            return {
                ...category,
                totalItemCount: totalItems + unclassifiedItems,
                dailyReviewCount: dailyReviews + unclassifiedDailyReviews,
            };
        });
    }, [categoriesQuery.data, itemCountByBoxQuery.data, dailyReviewCountByBoxQuery.data, unclassifiedItemCountByCategoryQuery.data, dailyUnclassifiedReviewCountByCategoryQuery.data]);

    return (
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
            {/* 左ペイン */}
            <div className="grid auto-rows-max items-start gap-4 md:gap-8 xl:col-span-1">
                <Card>
                    <CardHeader><CardTitle>今日の復習</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">全体: {totalDailyReviewCountQuery.data?.count ?? 0}</div>}
                        <Button className="mt-4 w-full" onClick={() => navigate('/today')}>今日の復習を開始</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>復習暦</CardTitle></CardHeader>
                    <CardContent><p className="text-xs text-muted-foreground">今後実装予定</p></CardContent>
                </Card>
            </div>

            {/* 右ペイン */}
            <div className="grid auto-rows-max items-start gap-4 md:gap-8 xl:col-span-2">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Card className="cursor-pointer hover:bg-muted" onClick={() => navigate(`/categories/${UNCLASSIFIED_ID}`)}>
                        <CardHeader><CardTitle>未分類復習物ボックス</CardTitle></CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold">総数: {unclassifiedItemCountQuery.data?.count ?? 0}</p>}
                        </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:bg-muted" onClick={() => navigate('/patterns')}>
                        <CardHeader><CardTitle>復習パターン一覧</CardTitle><CardDescription>復習パターンを管理します</CardDescription></CardHeader>
                    </Card>
                </div>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>カテゴリー一覧</CardTitle>
                        <Button size="sm" variant="outline" onClick={() => setCreateCategoryModalOpen(true)}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            カテゴリー作成
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        {isLoading ? (Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)) : (
                            categoriesWithStats.map(category => (
                                <div key={category.id} className="flex items-center p-2 rounded-md hover:bg-muted">
                                    <Link to={`/categories/${category.id}`} className="flex-grow grid grid-cols-3 items-center">
                                        <h3 className="font-semibold col-span-2">{category.name}</h3>
                                        <div className="text-sm text-muted-foreground text-right">
                                            <span>今日の復習: {category.dailyReviewCount} / </span>
                                            <span>総数: {category.totalItemCount}</span>
                                        </div>
                                    </Link>
                                    <div className="ml-4 flex items-center">
                                        <Button size="sm" variant="outline" className="h-8" onClick={(e) => { e.stopPropagation(); setCreatingBoxInCategory(category); }}>
                                            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                                            ボックス作成
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onClick={() => setEditingCategory(category)}>カテゴリーを編集</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* モーダル群 */}
            <CreateCategoryModal isOpen={isCreateCategoryModalOpen} onClose={() => setCreateCategoryModalOpen(false)} />
            {editingCategory && <EditCategoryModal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} category={editingCategory} />}
            {creatingBoxInCategory && <CreateBoxModal isOpen={!!creatingBoxInCategory} onClose={() => setCreatingBoxInCategory(null)} categoryId={creatingBoxInCategory.id} categoryName={creatingBoxInCategory.name} />}
        </div>
    );
};

export default HomePage;