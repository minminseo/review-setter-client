import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, /*useQueries*/ } from '@tanstack/react-query';
import { useBoxStore, useCategoryStore } from '@/store';
import { fetchBoxes } from '@/api/boxApi';
import { fetchCategories } from '@/api/categoryApi';
// import { fetchItemCountByBox, fetchUnclassifiedItemCountByCategory } from '@/api/itemApi'; // サマリー表示に必要
import { GetBoxOutput, /*GetCategoryOutput*/ } from '@/types';
import { UNCLASSIFIED_ID } from '@/constants';

// Shared & UI Components
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, /*CardDescription*/ } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardListSkeleton } from '@/components/shared/SkeletonLoader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Modals
import { CreateBoxModal } from '@/components/modals/CreateBoxModal';
import { EditBoxModal } from '@/components/modals/EditBoxModal';
import { EditCategoryModal } from '@/components/modals/EditCategoryModal';

/**
 * 特定のカテゴリーに属するボックス一覧を表示するページ。
 */
const CategoryPage = () => {
    const { categoryId } = useParams<{ categoryId: string }>();
    const navigate = useNavigate();

    // Zustandストアから必要なデータを取得
    const { categories, setCategories } = useCategoryStore();
    const { boxesByCategoryId, setBoxesForCategory } = useBoxStore();

    // 現在表示しているのが「未分類」ページかどうかを判定
    const isUnclassifiedPage = categoryId === UNCLASSIFIED_ID;
    const currentCategory = categories.find(c => c.id === categoryId);
    const boxes = boxesByCategoryId[categoryId || ''] || [];

    // モーダルの開閉状態を管理
    const [isCreateBoxModalOpen, setCreateBoxModalOpen] = React.useState(false);
    const [editingBox, setEditingBox] = React.useState<GetBoxOutput | null>(null);
    const [isEditCategoryModalOpen, setEditCategoryModalOpen] = React.useState(false);

    // --- データ取得 ---
    // 1. 全カテゴリーリスト (上部タブ表示用)
    const { data: fetchedCategories, isSuccess: categoriesSuccess } = useQuery({
        queryKey: ['categories'],
        queryFn: fetchCategories,
    });
    // 2. このカテゴリーに属するボックスリスト
    const { data: fetchedBoxes, isSuccess: boxesSuccess, isLoading } = useQuery({
        queryKey: ['boxes', categoryId],
        queryFn: () => fetchBoxes(categoryId!),
        // categoryIdが存在し、かつ「未分類」ページでない場合のみ実行
        enabled: !!categoryId && !isUnclassifiedPage,
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


    // パンくずリスト用のデータを生成
    const breadcrumbItems = [
        { label: 'Home', href: '/' },
        isUnclassifiedPage
            ? { label: '未分類' }
            : { label: currentCategory?.name || '...' },
    ];

    return (
        <div className="space-y-4">
            <Breadcrumbs items={breadcrumbItems} />

            {/* --- 上部ナビゲーションタブ --- */}
            <div className="space-y-2">
                {/* カテゴリー選択タブ */}
                <Tabs value={categoryId} onValueChange={(value) => navigate(`/categories/${value}`)}>
                    <TabsList>
                        <TabsTrigger value={UNCLASSIFIED_ID}>未分類</TabsTrigger>
                        {categories.map(cat => (
                            <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
                {/* ボックス選択タブ (未分類ページでは表示しない) */}
                {!isUnclassifiedPage && (
                    <Tabs onValueChange={(value) => navigate(`/categories/${categoryId}/boxes/${value}`)}>
                        <TabsList>
                            {boxes.map(box => (
                                <TabsTrigger key={box.id} value={box.id}>{box.name}</TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                )}
            </div>

            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">
                    {isUnclassifiedPage ? '未分類ボックス' : `ボックス一覧: ${currentCategory?.name}`}
                </h1>
                {!isUnclassifiedPage && (
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setCreateBoxModalOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />ボックス作成</Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditCategoryModalOpen(true)}>
                            {/* カテゴリー編集ボタン（歯車アイコンなど） */}
                        </Button>
                    </div>
                )}
            </div>

            {/* --- メインコンテンツ（ボックス一覧） --- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {isLoading ? (<CardListSkeleton count={4} />) : (
                    boxes.map((box) => (
                        <Card key={box.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    {box.name}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingBox(box); }}>編集</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                {/* TODO: ここに各ボックスのサマリー（アイテム数など）を表示 */}
                                <p className="text-sm text-muted-foreground">アイテム数: ...</p>
                            </CardContent>
                            <div className="p-4 pt-0">
                                <Button className="w-full" asChild>
                                    <Link to={`/categories/${categoryId}/boxes/${box.id}`}>開く</Link>
                                </Button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* --- モーダルコンポーネント --- */}
            {currentCategory && <CreateBoxModal isOpen={isCreateBoxModalOpen} onClose={() => setCreateBoxModalOpen(false)} categoryId={currentCategory.id} categoryName={currentCategory.name} />}
            {editingBox && currentCategory && <EditBoxModal isOpen={!!editingBox} onClose={() => setEditingBox(null)} box={editingBox} category={currentCategory} />}
            {currentCategory && <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => setEditCategoryModalOpen(false)} category={currentCategory} />}
        </div>
    );
};

export default CategoryPage;