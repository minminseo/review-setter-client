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
    const { itemsByBoxId, setItemsForBox } = useItemStore();
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
    const items = isBoxView && boxId ? (itemsByBoxId[boxId] || []) : [];

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
            if (!boxId) return Promise.resolve([]);
            if (boxId === UNCLASSIFIED_ID) {
                return categoryId === UNCLASSIFIED_ID
                    ? fetchUnclassifiedItems()
                    : fetchUnclassifiedItemsByCategory(categoryId!);
            }
            return fetchItemsByBox(boxId);
        },
        enabled: isBoxView,
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

    const displayedCategories = categories.slice(0, 7);
    const hasMoreCategories = categories.length > 7;

    const displayedBoxes = boxesForCurrentCategory.slice(0, 7);
    const hasMoreBoxes = boxesForCurrentCategory.length > 7;

    if (!categoryId) {
        return <div>カテゴリーIDが見つかりません</div>;
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden ">
            <div className="flex-shrink-0 space-y-4 p-4 ">
                <Breadcrumbs items={breadcrumbItems} />
                <div className="space-y-2 ">
                    <div className="flex items-center gap-1 ">
                        <span className="text-sm font-semibold shrink-0">カテゴリー:</span>
                        <div className="relative flex-grow ">
                            <Tabs value={categoryId} onValueChange={(value) => navigate(`/categories/${value}`)}>
                                <TabsList className="w-full ">
                                    <TabsTrigger value={UNCLASSIFIED_ID}>未分類</TabsTrigger>
                                    {displayedCategories.map((cat) => (
                                        <TabsTrigger key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                            {hasMoreCategories && (
                                <Button
                                    variant="ghost" size="icon" onClick={() => setSelectCategoryModalOpen(true)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 shrink-0 h-8 w-8"
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold shrink-0">ボックス:</span>
                        <div className="relative flex-grow">
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
                                <TabsList className="w-full">
                                    <TabsTrigger value="">全て</TabsTrigger>
                                    {!isUnclassifiedCategoryPage && (
                                        <TabsTrigger value={UNCLASSIFIED_ID}>未分類</TabsTrigger>
                                    )}
                                    {displayedBoxes.map((box) => (
                                        <TabsTrigger key={box.id} value={box.id}>
                                            {box.name}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                            {hasMoreBoxes && (
                                <Button
                                    variant="ghost" size="icon" onClick={() => setSelectBoxModalOpen(true)}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 shrink-0 h-8 w-8"
                                >
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isBoxView ? (
                <Box
                    key={boxId}
                    items={items}
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
        </div>
    );
};

export default BoxAndCategoryPage;