import * as React from 'react';
import { Link } from 'react-router-dom';
import { GetBoxOutput, GetCategoryOutput, PatternResponse, ItemCountGroupedByBoxResponse, DailyCountGroupedByBoxResponse } from '@/types';
import { useModal } from '@/contexts/ModalContext';
import { useQueries } from '@tanstack/react-query';
import { fetchPatterns } from '@/api/patternApi';
import { fetchItemCountByBox, fetchDailyReviewCountByBox } from '@/api/itemApi';
import { useTranslation } from 'react-i18next';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardListSkeleton } from '@/components/shared/SkeletonLoader';
import { SortDropdown } from '@/components/shared/SortDropdown';

// Modals
import { CreateBoxModal } from '@/components/modals/CreateBoxModal';
import { EditBoxModal } from '@/components/modals/EditBoxModal';
import { EditCategoryModal } from '@/components/modals/EditCategoryModal';
import { ClockIcon, Cog6ToothIcon, Cog8ToothIcon, DocumentIcon, InboxStackIcon, PlusCircleIcon, PlusIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

// Categoryコンポーネントが受け取るPropsの型定義
interface CategoryProps {
    boxes: GetBoxOutput[];
    isLoading: boolean;
    error: Error | null;
    currentCategory: GetCategoryOutput | undefined;
    isUnclassifiedPage: boolean;
}

/**
 * カテゴリー詳細ページのメインコンテンツ。
 * ボックスの一覧表示と、関連する操作（ボックス作成・編集、カテゴリー編集）を担当する。
 * @param props - 親コンポーネント(BoxAndCategoryPage)から渡されるデータと状態
 */
export const Category = ({ boxes, isLoading, error, currentCategory, isUnclassifiedPage }: CategoryProps) => {
    const { t } = useTranslation();

    const { openCreateItemModal } = useModal();

    // 必要なデータを並列で取得
    const results = useQueries({
        queries: [
            { queryKey: ['patterns'], queryFn: fetchPatterns, staleTime: 1000 * 60 * 5 },
            { queryKey: ['summary', 'itemCountByBox'], queryFn: fetchItemCountByBox },
            { queryKey: ['summary', 'dailyReviewCountByBox'], queryFn: fetchDailyReviewCountByBox },
        ],
    });

    const [patternsQuery, itemCountByBoxQuery, dailyReviewCountByBoxQuery] = results;
    const patterns = patternsQuery.data;

    // 復習パターン名を取得するヘルパー関数
    const getPatternName = (patternId: string | null): string => {
        if (!patternId || !patterns) return t('pattern.unset');
        const pattern = patterns.find(p => p.id === patternId);
        return pattern?.name || t('pattern.unset');
    };

    // ボックスのアイテム数を取得するヘルパー関数
    const getItemCount = (boxId: string): number => {
        if (!itemCountByBoxQuery.data) return 0;
        const itemCount = (itemCountByBoxQuery.data as ItemCountGroupedByBoxResponse[])
            .find(item => item.box_id === boxId);
        return itemCount?.count || 0;
    };

    // ボックスの今日の復習数を取得するヘルパー関数
    const getDailyReviewCount = (boxId: string): number => {
        if (!dailyReviewCountByBoxQuery.data) return 0;
        const dailyCount = (dailyReviewCountByBoxQuery.data as DailyCountGroupedByBoxResponse[])
            .find(item => item.box_id === boxId);
        return dailyCount?.count || 0;
    };

    // モーダルの開閉状態を管理
    const [isCreateBoxModalOpen, setCreateBoxModalOpen] = React.useState(false);
    const [editingBox, setEditingBox] = React.useState<GetBoxOutput | null>(null);
    const [isEditCategoryModalOpen, setEditCategoryModalOpen] = React.useState(false);

    // --- State (ソート) ---
    const [boxSortOrder, setBoxSortOrder] = React.useState('name_asc');
    const boxSortOptions = [
        { value: 'name_asc', label: t('box.nameAsc') },
        { value: 'name_desc', label: t('box.nameDesc') },
        { value: 'registered_at_desc', label: t('sort.createdDesc') },
        { value: 'edited_at_desc', label: t('sort.updatedDesc') },
        { value: 'edited_at_asc', label: t('sort.updatedAsc') },
    ];
    // --- ソート済みボックスリスト ---
    const sortedBoxes = React.useMemo(() => {
        if (!boxes) return [];
        const arr = [...boxes];
        switch (boxSortOrder) {
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
    }, [boxes, boxSortOrder]);

    // categoryIdが存在しない、またはカテゴリーが見つからない場合はエラー表示
    if (!isUnclassifiedPage && !currentCategory) {
        // isLoading中はスケルトンが表示されるため、ここではエラー時のみをハンドリング
        if (!isLoading) {
            return <div>カテゴリーが見つかりません。</div>;
        }
        return null; // ローディング中は何も表示しない
    }

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* --- 右上のアクションボタン群 --- */}
            <div className="flex items-center justify-end w-full pb-2 pt-2">
                {!isUnclassifiedPage && currentCategory && (
                    <div className="flex items-center gap-2 w-full">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-lg font-bold tracking-tight whitespace-nowrap"><InboxStackIcon className="inline-block mr-2 h-6 w-6" />{t('category.label')}：</span>
                            <span
                                className="text-xl font-semibold truncate min-w-0 flex-1"
                                title={currentCategory.name}
                            >
                                {currentCategory.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button onClick={() => setCreateBoxModalOpen(true)}>
                                <PlusIcon className="mr-2 h-4 w-4" />
                                {t('box.create')}
                            </Button>
                            <SortDropdown
                                options={boxSortOptions}
                                value={boxSortOrder}
                                onValueChange={setBoxSortOrder}
                            />
                            <Button variant="ghost" size="icon" onClick={() => setEditCategoryModalOpen(true)}>
                                <Cog8ToothIcon className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* --- メインコンテンツ（ボックス一覧） --- */}
            <ScrollArea className="w-full max-h-[calc(100vh-240px)]">
                <div className="flex flex-col gap-4 pb-4">
                    {isLoading ? (
                        <CardListSkeleton count={4} />
                    ) : error ? (
                        <div className="col-span-full text-center py-8">
                            <p className="text-red-500">{t('error.loadData')}</p>
                            <p className="text-sm text-muted-foreground mt-2">{t('error.reloadPage')}</p>
                        </div>
                    ) : sortedBoxes.length === 0 && !isUnclassifiedPage ? (
                        <div className="col-span-full text-center py-8">
                            <p className="text-muted-foreground">{t('box.noBoxes')}</p>
                        </div>
                    ) : (
                        sortedBoxes.map((box) => (
                            <Card key={box.id} className="flex flex-col overflow-hidden relative">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 absolute top-2 right-2 z-10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingBox(box);
                                    }}
                                >
                                    <Cog6ToothIcon className="h-4 w-4" />
                                </Button>
                                <CardHeader>
                                    <CardTitle>
                                        <span
                                            className="block text-sm truncate overflow-hidden whitespace-nowrap text-ellipsis "
                                            title={box.name}
                                        >
                                            {box.name}
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow px-4">
                                    <div className="flex items-start gap-4 flex-wrap">
                                        <Button asChild className="flex-shrink-0">
                                            <Link to={`/categories/${box.category_id}/boxes/${box.id}`}>{t('box.open')}</Link>
                                        </Button>
                                        <div className="flex flex-col items-start min-w-0 flex-shrink-0">
                                            <span className="text-xs text-muted-foreground mb-1">{t('review.itemLabel')}</span>
                                            <div className="flex items-center gap-2">
                                                <DocumentIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className="text-base font-medium">{getItemCount(box.id)}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start min-w-0 flex-shrink-0">
                                            <span className="text-xs text-muted-foreground mb-1 whitespace-nowrap">{t('review.todayLabel')}</span>
                                            <div className="flex items-center gap-2">
                                                <ClockIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className="text-base font-medium">{getDailyReviewCount(box.id)}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-start min-w-0 flex-1 max-w-[200px]">
                                            <span className="text-xs text-muted-foreground mb-1 whitespace-nowrap">{t('review.patternLabel')}</span>
                                            <div className="flex items-center gap-2 min-w-0 w-full">
                                                <Squares2X2Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span
                                                    className="text-base font-medium truncate min-w-0"
                                                    title={getPatternName(box.pattern_id)}
                                                >
                                                    {getPatternName(box.pattern_id)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
                <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
            </ScrollArea>

            {/* --- この画面で使われるモーダル群 --- */}
            {currentCategory && <CreateBoxModal isOpen={isCreateBoxModalOpen} onClose={() => setCreateBoxModalOpen(false)} categoryId={currentCategory.id} categoryName={currentCategory.name} />}
            {editingBox && currentCategory && <EditBoxModal isOpen={!!editingBox} onClose={() => setEditingBox(null)} box={editingBox} category={currentCategory} />}
            {currentCategory && <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => setEditCategoryModalOpen(false)} category={currentCategory} />}
        </div>
    );
};