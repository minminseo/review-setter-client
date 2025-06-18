import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, /*useQueries*/ } from '@tanstack/react-query';
import { useBoxStore, useCategoryStore } from '@/store';
import { fetchBoxes } from '@/api/boxApi';
import { fetchCategories } from '@/api/categoryApi';
// import { fetchItemCountByBox, fetchUnclassifiedItemCountByCategory } from '@/api/itemApi'; // サマリー表示に必要
import { GetBoxOutput } from '@/types';
import { UNCLASSIFIED_ID } from '@/constants';

// Shared & UI Components
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle, /*CardDescription*/ } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardListSkeleton } from '@/components/shared/SkeletonLoader';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'; // TabsListとTabsTriggerをインポート

// Modals
import { CreateBoxModal } from '@/components/modals/CreateBoxModal';
import { EditBoxModal } from '@/components/modals/EditBoxModal';
import { EditCategoryModal } from '@/components/modals/EditCategoryModal';
import { SelectCategoryModal } from '@/components/modals/SelectCategoryModal';
import { SelectBoxModal } from '@/components/modals/SelectBoxModal';


/**
 * 特定のカテゴリーに属するボックス一覧を表示するページ。
 */
const CategoryPage = () => {
    const { categoryId } = useParams<{ categoryId: string }>();
    const navigate = useNavigate();

    // Zustandストアから必要なデータを取得
    const { categories, setCategories } = useCategoryStore();
    const { boxesByCategoryId, setBoxesForCategory } = useBoxStore();

    // モーダルの開閉状態を管理
    const [isCreateBoxModalOpen, setCreateBoxModalOpen] = React.useState(false);
    const [editingBox, setEditingBox] = React.useState<GetBoxOutput | null>(null);
    const [isEditCategoryModalOpen, setEditCategoryModalOpen] = React.useState(false);
    const [isSelectCategoryModalOpen, setSelectCategoryModalOpen] = React.useState(false);
    const [isSelectBoxModalOpen, setSelectBoxModalOpen] = React.useState(false);

    // 現在表示しているのが「未分類」ページかどうかを判定
    const isUnclassifiedPage = categoryId === UNCLASSIFIED_ID;

    // --- データ取得 ---
    // 1. 全カテゴリーリスト (上部タブ表示用)
    const { data: fetchedCategories, isSuccess: categoriesSuccess } = useQuery({
        queryKey: ['categories'],
        queryFn: fetchCategories,
    });
    // 2. このカテゴリーに属するボックスリスト
    const { data: fetchedBoxes, isSuccess: boxesSuccess, isLoading, error: boxesError } = useQuery({
        queryKey: ['boxes', categoryId],
        queryFn: () => fetchBoxes(categoryId || ''),
        // categoryIdが存在し、かつ「未分類」ページでない場合のみ実行
        enabled: !!categoryId && !isUnclassifiedPage,
        retry: false, // エラー時のリトライを無効化
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

    // categoryIdが存在しない場合はエラーメッセージを表示
    if (!categoryId) {
        return <div>カテゴリーIDが見つかりません</div>;
    }

    const currentCategory = categories.find(c => c.id === categoryId);
    const boxes = boxesByCategoryId[categoryId] || [];

    // パンくずリスト用のデータを生成
    const breadcrumbItems = [
        { label: 'Home', href: '/' },
        isUnclassifiedPage
            ? { label: '未分類' }
            : { label: currentCategory?.name || '...' },
    ];

    // 表示するカテゴリータブを制限
    const displayedCategories = categories.slice(0, 7); // 最大7つまで表示
    const hasMoreCategories = categories.length > 7; // 8つ以上あれば「その他」を表示

    // 表示するボックスタブを制限
    const displayedBoxes = boxes.slice(0, 7); // 最大7つまで表示
    const hasMoreBoxes = boxes.length > 7; // 8つ以上あれば「その他」を表示


    return (
        <div className="space-y-4">
            <Breadcrumbs items={breadcrumbItems} />

            {/* --- 上部ナビゲーションタブ --- */}
            <div className="space-y-2">
                <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold shrink-0">カテゴリー:</span>
                    {/* カテゴリータブのコンテナ */}
                    <div className="relative flex-grow"> {/* relativeとflex-growを追加 */}
                        <Tabs value={categoryId} onValueChange={(value) => navigate(`/categories/${value}`)}>
                            <TabsList className="w-full"> {/* w-fullを追加 */}
                                {/* 未分類タブは常に表示 */}
                                <TabsTrigger value={UNCLASSIFIED_ID}>未分類</TabsTrigger>
                                {/* 表示制限されたカテゴリータブ */}
                                {displayedCategories.map(cat => (
                                    <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                        {/* カテゴリーが8つ以上ある場合のみ「その他」ボタンを表示 */}
                        {hasMoreCategories && (
                            <Button variant="ghost" size="icon" onClick={() => setSelectCategoryModalOpen(true)} className="absolute right-0 top-1/2 -translate-y-1/2 shrink-0 h-8 w-8"> {/* absolute, right-0, top-1/2, -translate-y-1/2を追加 */}
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>
                {!isUnclassifiedPage && (
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold shrink-0">ボックス:</span>
                        {/* ボックスタブのコンテナ */}
                        <div className="relative flex-grow"> {/* relativeとflex-growを追加 */}
                            <Tabs onValueChange={(value) => navigate(`/categories/${categoryId}/boxes/${value}`)}>
                                <TabsList className="w-full"> {/* w-fullを追加 */}
                                    {/* 表示制限されたボックスタブ */}
                                    {displayedBoxes.map(box => (
                                        <TabsTrigger key={box.id} value={box.id}>{box.name}</TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                            {/* ボックスが8つ以上ある場合のみ「その他」ボタンを表示 */}
                            {hasMoreBoxes && (
                                <Button variant="ghost" size="icon" onClick={() => setSelectBoxModalOpen(true)} className="absolute right-0 top-1/2 -translate-y-1/2 shrink-0 h-8 w-8"> {/* absolute, right-0, top-1/2, -translate-y-1/2を追加 */}
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end w-full py-2">
                {!isUnclassifiedPage && (
                    <Button
                        variant="outline"
                        className="mr-2"
                        onClick={() => navigate(`/categories/${categoryId}/boxes/unclassified`)}
                    >
                        未分類ボックス
                    </Button>
                )}
                <div className="flex items-center gap-2">
                    {!isUnclassifiedPage && (
                        <>
                            <Button onClick={() => setCreateBoxModalOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                ボックス作成
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setEditCategoryModalOpen(true)}>
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* --- メインコンテンツ（ボックス一覧） --- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {isLoading ? (
                    <CardListSkeleton count={4} />
                ) : boxesError ? (
                    // エラーが発生した場合
                    <div className="col-span-full text-center py-8">
                        <p className="text-red-500">データの読み込みに失敗しました。</p>
                        <p className="text-sm text-muted-foreground mt-2">ページを再読み込みしてください。</p>
                    </div>
                ) : boxes.length === 0 && !isUnclassifiedPage ? (
                    // データが空の場合（未分類ページ以外）
                    <div className="col-span-full text-center py-8">
                        <p className="text-muted-foreground">ボックスがありません。</p>
                    </div>
                ) : (
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
            <SelectCategoryModal isOpen={isSelectCategoryModalOpen} onClose={() => setSelectCategoryModalOpen(false)} onSelect={(category) => navigate(`/categories/${category.id}`)} />
            <SelectBoxModal isOpen={isSelectBoxModalOpen} onClose={() => setSelectBoxModalOpen(false)} onSelect={(box) => navigate(`/categories/${categoryId}/boxes/${box.id}`)} categoryId={categoryId} />
            {currentCategory && <CreateBoxModal isOpen={isCreateBoxModalOpen} onClose={() => setCreateBoxModalOpen(false)} categoryId={currentCategory.id} categoryName={currentCategory.name} />}
            {editingBox && currentCategory && <EditBoxModal isOpen={!!editingBox} onClose={() => setEditingBox(null)} box={editingBox} category={currentCategory} />}
            {currentCategory && <EditCategoryModal isOpen={isEditCategoryModalOpen} onClose={() => setEditCategoryModalOpen(false)} category={currentCategory} />}
        </div>
    );
};

export default CategoryPage;