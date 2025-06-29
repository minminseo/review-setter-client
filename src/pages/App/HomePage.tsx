import * as React from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { fetchPatterns } from '@/api/patternApi';
import { GetCategoryOutput, ItemCountGroupedByBoxResponse, UnclassifiedItemCountGroupedByCategoryResponse, DailyCountGroupedByBoxResponse, UnclassifiedDailyDatesCountGroupedByCategoryResponse } from '@/types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';


// Modals
import { CreateCategoryModal } from '@/components/modals/CreateCategoryModal';
import { EditCategoryModal } from '@/components/modals/EditCategoryModal';
import { CreateBoxModal } from '@/components/modals/CreateBoxModal';
import { UNCLASSIFIED_ID } from '@/constants';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ClockIcon, Cog8ToothIcon, DocumentIcon, InboxIcon, InboxStackIcon, PlusIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { SortDropdown } from '@/components/shared/SortDropdown';

/**
 * ログイン後のホームページ（ダッシュボード）。
 * 今日の復習数、カテゴリー一覧、各種サマリーを表示する。
 */
const HomePage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { setCategories } = useCategoryStore();

    // モーダルの開閉状態を一元管理
    const [isCreateCategoryModalOpen, setCreateCategoryModalOpen] = React.useState(false);
    const [editingCategory, setEditingCategory] = React.useState<GetCategoryOutput | null>(null);
    const [creatingBoxInCategory, setCreatingBoxInCategory] = React.useState<GetCategoryOutput | null>(null);
    const [categorySortOrder, setCategorySortOrder] = React.useState('name_asc');

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
        // カテゴリーデータが必須。他のデータは失敗しても基本表示は維持
        if (!categoriesQuery.data) {
            return [];
        }

        // 各データを安全に取得（失敗した場合は空配列として扱う）
        const itemCountByBox = (itemCountByBoxQuery.data || []) as ItemCountGroupedByBoxResponse[];
        const dailyCountByBox = (dailyReviewCountByBoxQuery.data || []) as DailyCountGroupedByBoxResponse[];
        const unclassifiedItemCount = (unclassifiedItemCountByCategoryQuery.data || []) as UnclassifiedItemCountGroupedByCategoryResponse[];
        const unclassifiedDailyCount = (dailyUnclassifiedReviewCountByCategoryQuery.data || []) as UnclassifiedDailyDatesCountGroupedByCategoryResponse[];

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

    // カテゴリー並び順に応じてcategoriesWithStatsをソート
    const sortedCategoriesWithStats = React.useMemo(() => {
        if (!categoriesWithStats) return [];
        const arr = [...categoriesWithStats];
        switch (categorySortOrder) {
            case 'name_asc':
                return arr.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
            case 'name_desc':
                return arr.sort((a, b) => b.name.localeCompare(a.name, 'ja'));
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
    }, [categoriesWithStats, categorySortOrder]);

    // 復習パターン一覧取得
    const { data: patterns, isLoading: isPatternLoading } = useQuery({
        queryKey: ['patterns'],
        queryFn: fetchPatterns,
        staleTime: 1000 * 60 * 5,
    });

    return (
        <ScrollArea className="w-full h-full">
            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
                {/* 左ペイン */}
                <div className="grid auto-rows-max items-start gap-4 md:gap-8 xl:col-span-1">
                    <Card>
                        <CardHeader><CardTitle>{t('home.todaysReview')}</CardTitle></CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold"><ClockIcon className="inline-block mr-2 h-6 w-6" />
                                {totalDailyReviewCountQuery.data?.count ?? 0}</div>}
                            <Button className="mt-4 w-full" onClick={() => navigate('/today')}>{t('home.startTodaysReview')}</Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>{t('home.dashboard')}</CardTitle></CardHeader>
                        <CardContent><p className="text-xs text-muted-foreground">{t('home.comingSoon')}</p></CardContent>
                    </Card>
                </div>

                {/* 右ペイン */}
                <div className="grid auto-rows-max items-start gap-4 md:gap-4 xl:col-span-2">

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card className="cursor-pointer hover:bg-muted" onClick={() => navigate(`/categories/${UNCLASSIFIED_ID}/boxes/${UNCLASSIFIED_ID}`)}>
                            <CardHeader><CardTitle><InboxIcon className="inline-block mr-2 h-6 w-6" />{t('home.unclassifiedBox')}</CardTitle></CardHeader>
                            <CardContent>
                                {isLoading ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold"><DocumentIcon className="inline-block mr-2 h-6 w-6" />
                                    {unclassifiedItemCountQuery.data?.count ?? 0}</p>}
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:bg-muted" onClick={() => navigate('/patterns')}>
                            <CardHeader><CardTitle>{t('home.reviewPatterns')}</CardTitle></CardHeader>
                            <CardContent>
                                {(isLoading || isPatternLoading) ? <Skeleton className="h-8 w-20" /> : <p className="text-2xl font-bold"><Squares2X2Icon className="inline-block mr-2 h-6 w-6" />
                                    {patterns ? patterns.length : 0}</p>}
                            </CardContent>
                        </Card>
                    </div>
                    <div className="h-screen flex flex-col">
                        <div className="flex-1 flex flex-col p-0">
                            <Card >
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>
                                        <InboxStackIcon className="inline-block mr-2 h-6 w-6" />
                                        {t('home.categories')}
                                        {!isLoading && (
                                            <span className="ml-2 text-base text-muted-foreground font-normal">
                                                ({sortedCategoriesWithStats.length})
                                            </span>
                                        )}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setCreateCategoryModalOpen(true)}>
                                            <PlusIcon className="h-4 w-4 mr-2" />
                                            {t('home.createCategory')}
                                        </Button>
                                        <SortDropdown
                                            options={[
                                                { value: 'name_asc', label: t('sort.nameAsc') },
                                                { value: 'name_desc', label: t('sort.nameDesc') },
                                                { value: 'registered_at_desc', label: t('sort.createdDesc') },
                                                { value: 'registered_at_asc', label: t('sort.createdAsc') },
                                                { value: 'edited_at_desc', label: t('sort.updatedDesc') },
                                                { value: 'edited_at_asc', label: t('sort.updatedAsc') },
                                            ]}
                                            value={categorySortOrder}
                                            onValueChange={setCategorySortOrder}
                                        />
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-1 pt-3 px-3">
                                    {isLoading ? (
                                        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
                                    ) : (
                                        sortedCategoriesWithStats.map(category => (
                                            <div
                                                key={category.id}
                                                className="flex flex-col sm:flex-row sm:items-center p-2 rounded-md hover:bg-muted gap-2"
                                            >
                                                <Link
                                                    to={`/categories/${category.id}`}
                                                    className="flex-grow grid grid-cols-1 sm:grid-cols-3 items-center gap-1"
                                                >

                                                    <div
                                                        className="font-semibold sm:col-span-2 truncate"
                                                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                        title={category.name}
                                                    >
                                                        <InboxStackIcon className="inline-block mr-2 h-6 w-6" />{category.name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground flex gap-4 justify-end text-right w-full">
                                                        <span className="inline-flex items-center min-w-[60px]">
                                                            <ClockIcon className="inline-block mr-1 h-4 w-4" />
                                                            {category.dailyReviewCount}
                                                        </span>
                                                        <span className="inline-flex items-center min-w-[60px]">
                                                            <DocumentIcon className="inline-block mr-1 h-4 w-4" />
                                                            {category.totalItemCount}
                                                        </span>
                                                    </div>
                                                </Link>
                                                <div className="flex items-center justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 transition-colors hover:bg-gray-200 hover:brightness-150"
                                                        onClick={() => setEditingCategory(category)}
                                                    >
                                                        <Cog8ToothIcon className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>

                            </Card>
                        </div>
                    </div>
                </div>

                {/* モーダル群 */}
                <CreateCategoryModal isOpen={isCreateCategoryModalOpen} onClose={() => setCreateCategoryModalOpen(false)} />
                {editingCategory && <EditCategoryModal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} category={editingCategory} />}
                {creatingBoxInCategory && <CreateBoxModal isOpen={!!creatingBoxInCategory} onClose={() => setCreatingBoxInCategory(null)} categoryId={creatingBoxInCategory.id} categoryName={creatingBoxInCategory.name} />}
            </div>
            <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
        </ScrollArea>
    );
};

export default HomePage;