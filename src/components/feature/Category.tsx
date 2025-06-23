import * as React from 'react';
import { Link } from 'react-router-dom';
import { GetBoxOutput, GetCategoryOutput, PatternResponse, ItemCountGroupedByBoxResponse, DailyCountGroupedByBoxResponse } from '@/types';
import { useModal } from '@/contexts/ModalContext';
import { useQueries } from '@tanstack/react-query';
import { fetchPatterns } from '@/api/patternApi';
import { fetchItemCountByBox, fetchDailyReviewCountByBox } from '@/api/itemApi';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { CardListSkeleton } from '@/components/shared/SkeletonLoader';

// Modals
import { CreateBoxModal } from '@/components/modals/CreateBoxModal';
import { EditBoxModal } from '@/components/modals/EditBoxModal';
import { EditCategoryModal } from '@/components/modals/EditCategoryModal';
import { CogIcon } from '@heroicons/react/24/outline';

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
        if (!patternId || !patterns) return '未設定';
        const pattern = patterns.find(p => p.id === patternId);
        return pattern?.name || '未設定';
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

    // categoryIdが存在しない、またはカテゴリーが見つからない場合はエラー表示
    if (!isUnclassifiedPage && !currentCategory) {
        // isLoading中はスケルトンが表示されるため、ここではエラー時のみをハンドリング
        if (!isLoading) {
            return <div>カテゴリーが見つかりません。</div>;
        }
        return null; // ローディング中は何も表示しない
    }

    return (
        <div>
            {/* --- 右上のアクションボタン群 --- */}
            <div className="flex items-center justify-end w-full pb-3 pt-3">
                {!isUnclassifiedPage && currentCategory && (
                    <div className="flex items-center gap-2 w-full">
                        <span className="flex items-center gap-2 mr-auto min-w-0">
                            <span className="text-2xl font-bold tracking-tight whitespace-nowrap">カテゴリー：</span>
                            <span
                                className="text-xl font-semibold truncate align-middle text-left max-w-[calc(100vw-480px)] whitespace-nowrap"
                                title={currentCategory.name}
                            >
                                {currentCategory.name}
                            </span>
                        </span>
                        <Button onClick={() => setCreateBoxModalOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            ボックス作成
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditCategoryModalOpen(true)}>
                            <CogIcon className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* --- メインコンテンツ（ボックス一覧） --- */}
            <div className="flex flex-col gap-4">
                {isLoading ? (
                    <CardListSkeleton count={4} />
                ) : error ? (
                    <div className="col-span-full text-center py-8">
                        <p className="text-red-500">データの読み込みに失敗しました。</p>
                        <p className="text-sm text-muted-foreground mt-2">ページを再読み込みしてください。</p>
                    </div>
                ) : boxes.length === 0 && !isUnclassifiedPage ? (
                    <div className="col-span-full text-center py-8">
                        <p className="text-muted-foreground">ボックスがありません。「ボックス作成」ボタンから新しいボックスを作成してください。</p>
                    </div>
                ) : (
                    boxes.map((box) => (
                        <Card key={box.id} className="flex flex-col overflow-hidden relative">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-2 right-2 z-10">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingBox(box); }}>編集</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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
                                <div className="flex gap-4">
                                    <Button asChild>
                                        <Link to={`/categories/${box.category_id}/boxes/${box.id}`}>開く</Link>
                                    </Button>
                                    <div className="flex flex-col items-start">
                                        <span className="text-xs text-muted-foreground">復習物数</span>
                                        <span className="text-base font-medium">{getItemCount(box.id)}</span>
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-xs text-muted-foreground">復習パターン</span>
                                        <span
                                            className="text-base font-medium truncate max-w-[100px]"
                                            title={getPatternName(box.pattern_id)}
                                        >
                                            {getPatternName(box.pattern_id)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-xs text-muted-foreground">今日の復習数</span>
                                        <span className="text-base font-medium">{getDailyReviewCount(box.id)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* --- この画面で使われるモーダル群 --- */}
            {currentCategory && <CreateBoxModal isOpen={isCreateBoxModalOpen} onClose={() => setCreateBoxModalOpen(false)} categoryId={currentCategory.id} categoryName={currentCategory.name} />}
            {editingBox && currentCategory && <EditBoxModal isOpen={!!editingBox} onClose={() => setEditingBox(null)} box={editingBox} category={currentCategory} />}
            {currentCategory && <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => setEditCategoryModalOpen(false)} category={currentCategory} />}
        </div>
    );
};