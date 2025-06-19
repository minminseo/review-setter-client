import * as React from 'react';
import { Link } from 'react-router-dom';
import { GetBoxOutput, GetCategoryOutput } from '@/types';
import { useModal } from '@/contexts/ModalContext';

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
        <div className="p-4 pt-0">
            {/* --- 右上のアクションボタン群 --- */}
            <div className="flex items-center justify-end w-full py-2">
                {!isUnclassifiedPage && currentCategory && (
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => openCreateItemModal({
                                categoryId: currentCategory.id,
                                boxId: 'unclassified'
                            })}
                            variant="outline"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            復習物作成
                        </Button>
                        <Button onClick={() => setCreateBoxModalOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            ボックス作成
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditCategoryModalOpen(true)}>
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>

            {/* --- メインコンテンツ（ボックス一覧） --- */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                        <Card key={box.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span className="truncate">{box.name}</span>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0"><MoreHorizontal className="h-4 w-4" /></Button>
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
                            <div className="p-4 pt-0 mt-auto">
                                <Button className="w-full" asChild>
                                    <Link to={`/categories/${box.category_id}/boxes/${box.id}`}>開く</Link>
                                </Button>
                            </div>
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