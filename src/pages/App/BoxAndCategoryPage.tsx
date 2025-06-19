import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// useQueryClient をインポートに追加
import { useQuery, /*useQueryClient*/ } from '@tanstack/react-query';
import { useBoxStore, useCategoryStore, useItemStore, usePatternStore } from '@/store';
import { fetchBoxes } from '@/api/boxApi';
import { fetchCategories } from '@/api/categoryApi';
import { fetchItemsByBox, fetchUnclassifiedItems, fetchUnclassifiedItemsByCategory } from '@/api/itemApi';
import { fetchPatterns } from '@/api/patternApi';
// 未使用の警告を解決するため、型インポートを一度削除（子コンポーネント側で必要）
import { UNCLASSIFIED_ID } from '@/constants';

// Shared & UI Components
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal } from 'lucide-react';

// Modals
import { SelectCategoryModal } from '@/components/modals/SelectCategoryModal';
import { SelectBoxModal } from '@/components/modals/SelectBoxModal';

// Feature Components
import { Category } from '@/components/feature/Category';
import { Box } from '@/components/feature/Box';
import { useRef, useEffect, useState } from 'react';

/**
 * カテゴリーページとボックスページを統合したコンポーネント。
 * URLの `:boxId` の有無によって、表示する内容（カテゴリー詳細 or ボックス詳細）を動的に切り替える。
 */
const BoxAndCategoryPage = () => {
    // --- Hooks ---
    const { categoryId, boxId } = useParams<{ categoryId: string; boxId?: string }>();
    const navigate = useNavigate();
    // queryClient は invalidate などキャッシュ操作が必要な場合にのみ呼び出す
    // const queryClient = useQueryClient(); // 今回は不要なためコメントアウト

    // --- Zustandストア ---
    const { categories, setCategories } = useCategoryStore();
    const { boxesByCategoryId, setBoxesForCategory } = useBoxStore();
    const { setItemsForBox } = useItemStore();
    const { setPatterns } = usePatternStore();


    // --- State ---
    const [isSelectCategoryModalOpen, setSelectCategoryModalOpen] = React.useState(false);
    const [isSelectBoxModalOpen, setSelectBoxModalOpen] = React.useState(false);

    // --- Derived State (計算済み変数) ---
    const isBoxView = !!boxId;
    const isUnclassifiedCategoryPage = categoryId === UNCLASSIFIED_ID;

    const currentCategory = categories.find(c => c.id === categoryId);
    const boxesForCurrentCategory = boxesByCategoryId[categoryId || ''] || [];
    const currentBox = isBoxView ? boxesForCurrentCategory.find(b => b.id === boxId) : null;
    // items は Box コンポーネントに直接 fetchedItems から渡すため、ここでは不要

    // --- データ取得 (React Query) ---

    // 1. 全カテゴリーリスト
    const { data: fetchedCategories, isSuccess: categoriesSuccess } = useQuery({
        queryKey: ['categories'],
        queryFn: fetchCategories,
    });

    // 2. 現在のカテゴリーに属するボックスリスト
    const { data: fetchedBoxes, isSuccess: boxesSuccess, isLoading: isBoxesLoading, error: boxesError } = useQuery({
        queryKey: ['boxes', categoryId],
        queryFn: () => fetchBoxes(categoryId!),
        enabled: !!categoryId && !isUnclassifiedCategoryPage,
        retry: false,
    });

    // 3. (ボックス表示時のみ) 現在のボックスに属するアイテムリスト
    const { data: fetchedItems, isLoading: isItemsLoading, isSuccess: itemsSuccess } = useQuery({
        queryKey: ['items', boxId, categoryId],
        queryFn: () => {
            // 1. category_idもbox_idもNULL（完全未分類）
            if (!categoryId && !boxId) {
                return fetchUnclassifiedItems();
            }
            // 2. category_idが非NULLでbox_idがNULL（カテゴリー未分類ボックス）
            if (categoryId && !boxId) {
                return fetchUnclassifiedItemsByCategory(categoryId);
            }
            // 3. 通常のボックス
            if (boxId) {
                return fetchItemsByBox(boxId);
            }
            return [];
        },
        enabled: isBoxView || !boxId, // ボックス画面 or 未分類ボックス画面
    });

    // 4. 全復習パターン
    // ★修正点: onSuccess を削除し、useEffect で副作用を扱う
    const { data: fetchedPatterns, isSuccess: patternsSuccess } = useQuery({
        queryKey: ['patterns'],
        queryFn: fetchPatterns,
        staleTime: Infinity,
    });


    // --- データ取得後の副作用 (ストアの更新) ---
    React.useEffect(() => {
        if (categoriesSuccess && fetchedCategories) setCategories(fetchedCategories);
    }, [categoriesSuccess, fetchedCategories, setCategories]);

    React.useEffect(() => {
        if (boxesSuccess && fetchedBoxes && categoryId) {
            setBoxesForCategory(categoryId, fetchedBoxes);
        }
    }, [boxesSuccess, fetchedBoxes, categoryId, setBoxesForCategory]);

    React.useEffect(() => {
        if (itemsSuccess && fetchedItems && boxId) {
            // 完了済みアイテムを除外してストアに保存
            const activeItems = fetchedItems.filter(item => !item.is_finished);
            setItemsForBox(boxId, activeItems);
        }
    }, [itemsSuccess, fetchedItems, boxId, setItemsForBox]);

    // ★修正点: パターン取得後の副作用を useEffect に分離
    React.useEffect(() => {
        if (patternsSuccess && fetchedPatterns) {
            setPatterns(fetchedPatterns);
        }
    }, [patternsSuccess, fetchedPatterns, setPatterns]);


    // --- UI表示用データ ---

    const breadcrumbItems = React.useMemo(() => {
        const items = [{ label: 'Home', href: '/' }];
        if (currentCategory) {
            items.push({ label: currentCategory.name, href: `/categories/${categoryId}` });
        } else if (isUnclassifiedCategoryPage) {
            items.push({
                label: '未分類',
                href: ''
            });
        } else {
            items.push({
                label: '...',
                href: ''
            });
        }

        if (isBoxView && currentBox) {
            items.push({
                label: currentBox.name,
                href: ''
            });
        } else if (isBoxView && boxId === UNCLASSIFIED_ID) {
            items.push({
                label: '未分類ボックス',
                href: ''
            });
        }
        return items;
    }, [currentCategory, categoryId, isUnclassifiedCategoryPage, isBoxView, currentBox, boxId]);

    // --- タブのレスポンシブ表示制御 ---
    const categoryTabsContainerRef = useRef<HTMLDivElement>(null);
    const boxTabsContainerRef = useRef<HTMLDivElement>(null);

    const [maxCategoryTabs, setMaxCategoryTabs] = useState<number>(7);
    const [maxBoxTabs, setMaxBoxTabs] = useState<number>(7);

    // タブの最大表示数を計算（レスポンシブ）
    useEffect(() => {
        const calcTabs = () => {
            // タブ1つの最小幅（rem単位→px換算、1rem=16px想定）
            const tabMinWidth = 96; // 6rem * 16px
            const padding = 32; // 余白やボタン分
            if (categoryTabsContainerRef.current) {
                const width = categoryTabsContainerRef.current.offsetWidth - padding;
                setMaxCategoryTabs(Math.max(1, Math.floor(width / tabMinWidth) - 1)); // -1は「未分類」分
            }
            if (boxTabsContainerRef.current) {
                const width = boxTabsContainerRef.current.offsetWidth - padding;
                setMaxBoxTabs(Math.max(1, Math.floor(width / tabMinWidth) - 1)); // -1は「全て」分
            }
        };
        calcTabs();
        window.addEventListener('resize', calcTabs);
        return () => window.removeEventListener('resize', calcTabs);
    }, []);

    // 表示するカテゴリー・ボックス
    const displayedCategories = categories.slice(0, maxCategoryTabs);
    const hasMoreCategories = categories.length > maxCategoryTabs;

    const displayedBoxes = boxesForCurrentCategory.slice(0, maxBoxTabs);
    const hasMoreBoxes = boxesForCurrentCategory.length > maxBoxTabs;

    if (!categoryId) {
        return <div>カテゴリーIDが見つかりません</div>;
    }

    return (
        <div className="min-h-screen flex flex-col overflow-hidden">
            {/* 上部固定ヘッダー */}
            <div
                className="flex-shrink-0 space-y-4 bg-background z-10"
                style={{
                    position: 'sticky',
                    top: 0,
                    boxShadow: '0 2px 8px -4px rgba(0,0,0,0.08)',
                }}
            >
                <Breadcrumbs items={breadcrumbItems} />
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
                            <div className="flex-1 min-w-0 flex">
                                <Tabs value={categoryId} onValueChange={(value) => navigate(`/categories/${value}`)}>
                                    <TabsList
                                        className="flex w-full"
                                        style={{
                                            width: '100%',
                                        }}
                                    >
                                        <TabsTrigger value={UNCLASSIFIED_ID}>未分類</TabsTrigger>
                                        {displayedCategories.map((cat) => (
                                            <TabsTrigger key={cat.id} value={cat.id} className="flex-1 min-w-0">
                                                {cat.name}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </div>
                            <div className="flex-shrink-0 flex items-center" style={{ width: 40 }}>
                                {hasMoreCategories && (
                                    <Button
                                        variant="ghost" size="icon" onClick={() => setSelectCategoryModalOpen(true)}
                                        className="ml-1 shrink-0 h-8 w-8"
                                    >
                                        <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* ボックスラベル */}
                    <div className="flex items-center">
                        <span className="text-sm font-semibold shrink-0">ボックス:</span>
                    </div>
                    {/* ボックスタブ */}
                    <div className="flex items-center min-h-[2.5rem] w-full max-w-full overflow-hidden">
                        <div className="relative flex items-center w-full max-w-full" ref={boxTabsContainerRef}>
                            <div className="flex-1 min-w-0 flex">
                                <Tabs
                                    value={boxId || ''}
                                    onValueChange={(value) => {
                                        if (value) {
                                            navigate(`/categories/${categoryId}/boxes/${value}`)
                                        } else {
                                            navigate(`/categories/${categoryId}`)
                                        }
                                    }}
                                >
                                    <TabsList
                                        className="flex w-full"
                                        style={{
                                            width: '100%',
                                            borderRadius: '0.75rem',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <TabsTrigger value="">全て</TabsTrigger>
                                        {!isUnclassifiedCategoryPage && (
                                            <TabsTrigger value={UNCLASSIFIED_ID}>未分類</TabsTrigger>
                                        )}
                                        {displayedBoxes.map((box) => (
                                            <TabsTrigger key={box.id} value={box.id} className="flex-1 min-w-0">
                                                {box.name}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </div>
                            <div className="flex-shrink-0 flex items-center" style={{ width: 40 }}>
                                {hasMoreBoxes && (
                                    <Button
                                        variant="ghost" size="icon" onClick={() => setSelectBoxModalOpen(true)}
                                        className="ml-1 shrink-0 h-8 w-8"
                                    >
                                        <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* メインコンテンツ */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                    {isBoxView ? (
                        <Box
                            key={boxId}
                            items={fetchedItems ? fetchedItems.filter(item => !item.is_finished) : []}
                            isLoading={isItemsLoading}
                            currentCategory={currentCategory}
                            currentBox={currentBox}
                        />
                    ) : (
                        <Category
                            key={categoryId}
                            boxes={boxesForCurrentCategory}
                            isLoading={isBoxesLoading}
                            error={boxesError}
                            currentCategory={currentCategory}
                            isUnclassifiedPage={isUnclassifiedCategoryPage}
                        />
                    )}
                </div>
            </div>

            <SelectCategoryModal
                isOpen={isSelectCategoryModalOpen}
                onClose={() => setSelectCategoryModalOpen(false)}
                onSelect={(category) => navigate(`/categories/${category.id}`)}
            />
            <SelectBoxModal
                isOpen={isSelectBoxModalOpen}
                onClose={() => setSelectBoxModalOpen(false)}
                onSelect={(box) => navigate(`/categories/${categoryId}/boxes/${box.id}`)}
                categoryId={categoryId}
            />
        </div>
    );
};

export default BoxAndCategoryPage;