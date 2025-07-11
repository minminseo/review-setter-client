import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useBoxStore, useCategoryStore, useItemStore, usePatternStore } from '@/store';
import { useModal } from '@/contexts/ModalContext';
import { fetchBoxes } from '@/api/boxApi';
import { fetchCategories } from '@/api/categoryApi';
import { fetchItemsByBox, fetchUnclassifiedItems, fetchUnclassifiedItemsByCategory } from '@/api/itemApi';
import { fetchPatterns } from '@/api/patternApi';
import { UNCLASSIFIED_ID } from '@/constants';
import { useTranslation } from 'react-i18next';

import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MoreHorizontal } from 'lucide-react';

import { SelectCategoryModal } from '@/components/modals/SelectCategoryModal';
import { SelectBoxModal } from '@/components/modals/SelectBoxModal';

import { Category } from '@/components/feature/Category';
import { Box } from '@/components/feature/Box';
import { useRef, useEffect, useState } from 'react';
import { InboxIcon, InboxStackIcon } from '@heroicons/react/24/outline';

/**
 * カテゴリーページとボックスページを統合したコンポーネント。
 * URLの `:boxId` の有無によって、表示する内容（カテゴリー詳細 or ボックス詳細）を動的に切り替える。
 */
const BoxAndCategoryPage = () => {
    const { t } = useTranslation();
    const { categoryId, boxId } = useParams<{ categoryId: string; boxId?: string }>();
    const navigate = useNavigate();

    // Zustandストア
    const { categories, setCategories } = useCategoryStore();
    const { boxesByCategoryId, setBoxesForCategory } = useBoxStore();
    const { setItemsForBox } = useItemStore();
    const { setPatterns } = usePatternStore();

    // Modal Context
    const { updateCreateItemContext } = useModal();

    const [isSelectCategoryModalOpen, setSelectCategoryModalOpen] = React.useState(false);
    const [isSelectBoxModalOpen, setSelectBoxModalOpen] = React.useState(false);
    // カテゴリー・ボックスの選択状態をuseStateで管理
    const [selectedCategoryId, setSelectedCategoryId] = React.useState(categoryId || UNCLASSIFIED_ID);
    const [selectedBoxId, setSelectedBoxId] = React.useState(boxId || UNCLASSIFIED_ID);

    // サイドバーやURLのcategoryId/boxId変更時にタブ選択も同期
    React.useEffect(() => {
        setSelectedCategoryId(categoryId || UNCLASSIFIED_ID);
        setSelectedBoxId(boxId || (categoryId === UNCLASSIFIED_ID ? UNCLASSIFIED_ID : ''));
    }, [categoryId, boxId]);

    // タブ選択状況が変更されたときにModalContextを更新
    React.useEffect(() => {
        updateCreateItemContext({
            categoryId: selectedCategoryId,
            boxId: selectedBoxId
        });
    }, [selectedCategoryId, selectedBoxId, updateCreateItemContext]);

    // カテゴリータブ変更時のハンドラ
    const handleCategoryTabChange = (value: string) => {
        setSelectedCategoryId(value);
        if (value === UNCLASSIFIED_ID) {
            setSelectedBoxId(UNCLASSIFIED_ID); // 未分類カテゴリー選択時はボックスも未分類に
            navigate(`/categories/${UNCLASSIFIED_ID}/boxes/${UNCLASSIFIED_ID}`);
        } else {
            setSelectedBoxId(''); // 通常カテゴリー時は全て
            navigate(`/categories/${value}`);
        }
    };
    // ボックスタブ変更時のハンドラ
    const handleBoxTabChange = (value: string) => {
        setSelectedBoxId(value);
        if (value) {
            navigate(`/categories/${selectedCategoryId}/boxes/${value}`);
        } else {
            navigate(`/categories/${selectedCategoryId}`);
        }
    };

    // storeBoxIdの計算ロジックを統一
    const getStoreBoxId = React.useCallback((boxId: string | undefined, categoryId: string | undefined) => {
        if ((boxId === 'unclassified' || boxId === UNCLASSIFIED_ID || !boxId) && categoryId && categoryId !== UNCLASSIFIED_ID && categoryId !== 'unclassified') {
            return `unclassified-${categoryId}`;
        } else if (!boxId || boxId === 'unclassified' || boxId === UNCLASSIFIED_ID) {
            return 'unclassified';
        }
        return boxId;
    }, []);

    // 計算済み変数
    const isBoxView = !!boxId;
    const isUnclassifiedCategoryPage = categoryId === UNCLASSIFIED_ID;

    const currentCategory = categories.find(c => c.id === categoryId);
    const boxesForCurrentCategory = boxesByCategoryId[categoryId || ''] || [];
    const currentBox = isBoxView ? boxesForCurrentCategory.find(b => b.id === boxId) : null;

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

    const enabledItemsQuery = isBoxView;

    // 3. (ボックス表示時のみ) 現在のボックスに属する復習物リスト
    const { data: fetchedItems, isLoading: isItemsLoading, isSuccess: itemsSuccess } = useQuery({
        queryKey: ['items', boxId, categoryId],
        queryFn: async () => {
            // 1. 通常のボックス
            if (boxId && boxId !== UNCLASSIFIED_ID && boxId !== 'unclassified') {
                return await fetchItemsByBox(boxId);
            }

            // 2. カテゴリー未分類以外＋ボックス未分類 
            if (categoryId && categoryId !== UNCLASSIFIED_ID && categoryId !== 'unclassified' && (boxId === UNCLASSIFIED_ID || boxId === 'unclassified')) {
                return await fetchUnclassifiedItemsByCategory(categoryId);
            }

            // 3. 完全未分類（カテゴリーもボックスも未分類）
            if ((categoryId === UNCLASSIFIED_ID || categoryId === 'unclassified') && (boxId === UNCLASSIFIED_ID || boxId === 'unclassified')) {
                return await fetchUnclassifiedItems();
            }

            return [];
        },
        enabled: enabledItemsQuery, // ボックス画面or未分類ボックス画面
    });

    // 4. 全パターン
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
        if (itemsSuccess && fetchedItems) {
            // 完了済み復習物を除外してストアに保存
            const activeItems = fetchedItems.filter(item => !item.is_finished);
            const storeBoxId = getStoreBoxId(boxId, categoryId);
            setItemsForBox(storeBoxId || '', activeItems);
        }
    }, [itemsSuccess, fetchedItems, boxId, categoryId, setItemsForBox, getStoreBoxId]);

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
                label: t('category.unclassified'),
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
                label: t('box.unclassified'),
                href: ''
            });
        }
        return items;
    }, [currentCategory, categoryId, isUnclassifiedCategoryPage, isBoxView, currentBox, boxId]);

    const categoryTabsContainerRef = useRef<HTMLDivElement>(null);
    const boxTabsContainerRef = useRef<HTMLDivElement>(null);

    const [maxCategoryTabs, setMaxCategoryTabs] = useState<number>(7);
    const [maxBoxTabs, setMaxBoxTabs] = useState<number>(7);

    useEffect(() => {
        const calcTabs = () => {
            const tabMinWidth = 112;
            const moreButtonWidth = 40;

            if (categoryTabsContainerRef.current) {
                const containerWidth = categoryTabsContainerRef.current.offsetWidth;
                const availableWidth = containerWidth * 0.95 - moreButtonWidth;
                const fixedTabsWidth = 1 * tabMinWidth;
                const remainingWidth = availableWidth - fixedTabsWidth;
                const maxDynamicTabs = Math.max(0, Math.floor(remainingWidth / tabMinWidth));
                setMaxCategoryTabs(maxDynamicTabs);
            }

            if (boxTabsContainerRef.current) {
                const containerWidth = boxTabsContainerRef.current.offsetWidth;
                const availableWidth = containerWidth * 0.95 - moreButtonWidth;
                const fixedTabsCount = selectedCategoryId === UNCLASSIFIED_ID ? 1 : 2;
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

    // 表示するカテゴリー・ボックス
    const displayedCategories = categories.slice(0, maxCategoryTabs);
    const hasMoreCategories = categories.length > maxCategoryTabs;

    const displayedBoxes = boxesForCurrentCategory.slice(0, maxBoxTabs);
    const hasMoreBoxes = boxesForCurrentCategory.length > maxBoxTabs;

    // --- メインコンテンツ ---
    const storeBoxId = getStoreBoxId(boxId, categoryId);
    const { getItemsForBox } = useItemStore();
    const zustandItems = getItemsForBox(storeBoxId || '');

    return (
        <>
            {/* 上部固定ヘッダー */}
            <div
                className="flex-shrink-0 space-y-4 z-10 "
                style={{
                    position: 'sticky',
                    top: 0,
                }}
            >
                <Breadcrumbs items={breadcrumbItems} />
                <div
                    className="grid grid-cols-[auto_1fr] grid-rows-2 gap-x-4 gap-y-2 items-stretch w-full max-w-full"
                    style={{ minWidth: 'min-content' }}
                >
                    {/* カテゴリータブ */}
                    <div className="flex items-center">
                        <span className="text-sm font-semibold shrink-0"><InboxStackIcon className="inline-block mr-2 h-6 w-6" />{t('category.label')}</span>
                    </div>
                    <div className="flex items-center min-h-[2.5rem] w-full max-w-full overflow-hidden">
                        <div className="relative flex items-center w-full max-w-full" ref={categoryTabsContainerRef}>
                            <div className="flex overflow-hidden" style={{ width: hasMoreCategories ? 'calc(100% - 48px)' : '100%' }}>
                                <Tabs value={selectedCategoryId} onValueChange={handleCategoryTabChange}>
                                    <TabsList
                                        className="flex gap-0.5 bg-neutral-200 dark:bg-neutral-800"
                                        style={{
                                            width: 'fit-content',
                                            maxWidth: '100%',
                                        }}
                                    >
                                        <TabsTrigger value={UNCLASSIFIED_ID} className="justify-start text-left w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">
                                            {t('category.unclassified')}
                                        </TabsTrigger>
                                        {displayedCategories.map((cat) => (
                                            <TabsTrigger key={cat.id} value={cat.id} className="w-[7rem] justify-start text-left shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">
                                                {cat.name}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            </div>
                            {hasMoreCategories && (
                                <div className="absolute right-0 flex items-center justify-center" style={{ width: 48, height: '100%' }}>
                                    <Button
                                        variant="ghost" size="icon" onClick={() => setSelectCategoryModalOpen(true)}
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
                        <span className="text-sm font-semibold shrink-0"><InboxIcon className="inline-block mr-2 h-6 w-6" />{t('box.label')}</span>
                    </div>
                    <div className="flex items-center min-h-[2.5rem] w-full max-w-full overflow-hidden">
                        <div className="relative flex items-center w-full max-w-full" ref={boxTabsContainerRef}>
                            <div className="flex overflow-hidden" style={{ width: (hasMoreBoxes && selectedCategoryId !== UNCLASSIFIED_ID) ? 'calc(100% - 48px)' : '100%' }}>
                                <Tabs
                                    value={selectedBoxId}
                                    onValueChange={handleBoxTabChange}
                                >
                                    <TabsList
                                        className="flex gap-0.5 bg-neutral-200 dark:bg-neutral-800"
                                        style={{
                                            width: 'fit-content',
                                            maxWidth: '100%',
                                            borderRadius: '0.75rem',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {selectedCategoryId === UNCLASSIFIED_ID ? (
                                            <TabsTrigger value={UNCLASSIFIED_ID} className="justify-start text-left w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">
                                                {t('box.unclassified')}
                                            </TabsTrigger>
                                        ) : (
                                            <>
                                                <TabsTrigger value="" className="justify-start text-left w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">
                                                    {t('box.all')}
                                                </TabsTrigger>
                                                <TabsTrigger value={UNCLASSIFIED_ID} className="justify-start text-left w-[7rem] shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">
                                                    {t('box.unclassified')}
                                                </TabsTrigger>
                                                {displayedBoxes.map((box) => (
                                                    <TabsTrigger key={box.id} value={box.id} className="w-[7rem] justify-start text-left shrink-0 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors data-[state=active]:bg-neutral-400 dark:data-[state=active]:bg-neutral-600">
                                                        {box.name}
                                                    </TabsTrigger>
                                                ))}
                                            </>
                                        )}
                                    </TabsList>
                                </Tabs>
                            </div>
                            {hasMoreBoxes && selectedCategoryId !== UNCLASSIFIED_ID && (
                                <div className="absolute right-0 flex items-center justify-center" style={{ width: 48, height: '100%' }}>
                                    <Button
                                        variant="ghost" size="icon" onClick={() => setSelectBoxModalOpen(true)}
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

            {/* メインコンテンツ */}
            {isBoxView ? (
                <Box
                    key={boxId}
                    items={zustandItems && zustandItems.length > 0
                        ? zustandItems
                        : (fetchedItems ? fetchedItems.filter(item => !item.is_finished) : [])}
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
        </>
    );
};

export default BoxAndCategoryPage;