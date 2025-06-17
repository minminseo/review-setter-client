import * as React from 'react';
import { useParams/*, useNavigate*/ } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';

// API & Store
import { fetchItemsByBox, deleteItem } from '@/api/itemApi';
import { fetchCategories } from '@/api/categoryApi';
import { fetchBoxes } from '@/api/boxApi';
import { useItemStore, useBoxStore, useCategoryStore } from '@/store';
import { useModal } from '@/contexts/ModalContext';
import { ItemResponse, ReviewDateResponse } from '@/types';
import { UNCLASSIFIED_ID } from '@/constants';

// Shared & UI Components
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, /*CardHeader, *//*CardTitle*/ } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, /*AlertDialogTrigger*/ } from '@/components/ui/alert-dialog';
// import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EllipsisHorizontalIcon, DocumentTextIcon, CheckCircleIcon, XCircleIcon, CogIcon, InformationCircleIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

// Modals
import { ItemDetailModal } from '@/components/modals/ItemDetailModal';
import { EditItemModal } from '@/components/modals/EditItemModal';
import { EditReviewDateModal } from '@/components/modals/EditReviewDateModal';
import { BoxSummaryModal } from '@/components/modals/BoxSummaryModal';
import { EditBoxModal } from '@/components/modals/EditBoxModal';
import { FinishedItemsModal } from '@/components/modals/FinishedItemsModal';
import { cn } from '@/lib/utils';

/**
 * 特定のボックスに属する復習物アイテムを一覧表示するページ。
 * このアプリケーションで最も情報量が多く、中心的な画面となる。
 */
const BoxPage = () => {
    const { categoryId, boxId } = useParams<{ categoryId: string; boxId: string }>();
    // const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { openCreateItemModal } = useModal();

    // Zustandストアから各種データを取得
    const { categories, setCategories } = useCategoryStore();
    const { boxesByCategoryId, setBoxesForCategory } = useBoxStore();
    const { itemsByBoxId, setItemsForBox, removeItemFromBox } = useItemStore();

    const items = itemsByBoxId[boxId || ''] || [];
    const currentCategory = categories.find(c => c.id === categoryId);
    const currentBox = boxesByCategoryId[categoryId || '']?.find(b => b.id === boxId);

    // モーダルの開閉状態を一元管理
    const [detailItem, setDetailItem] = React.useState<ItemResponse | null>(null);
    const [editingItem, setEditingItem] = React.useState<ItemResponse | null>(null);
    const [deletingItem, setDeletingItem] = React.useState<ItemResponse | null>(null);
    const [editingDate, setEditingDate] = React.useState<{ item: ItemResponse; reviewDate: ReviewDateResponse } | null>(null);
    const [isSummaryModalOpen, setSummaryModalOpen] = React.useState(false);
    const [isEditBoxModalOpen, setEditBoxModalOpen] = React.useState(false);
    const [isFinishedItemsModalOpen, setFinishedItemsModalOpen] = React.useState(false);

    // --- データ取得 ---
    // 1. このボックスに属するアイテムリスト
    const { data: fetchedItems, isLoading, isSuccess } = useQuery({
        queryKey: ['items', boxId],
        queryFn: () => fetchItemsByBox(boxId!),
        enabled: !!boxId,
    });
    // 2. 全カテゴリーリスト (上部タブ表示用)
    const { data: fetchedCategories, isSuccess: catSuccess } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
    // 3. このカテゴリーに属するボックスリスト (上部タブ表示用)
    const { data: fetchedBoxes, isSuccess: boxSuccess } = useQuery({
        queryKey: ['boxes', categoryId],
        queryFn: () => fetchBoxes(categoryId!),
        enabled: !!categoryId && categoryId !== UNCLASSIFIED_ID,
    });

    // --- データ取得後の副作用 (ストアの更新) ---
    React.useEffect(() => { if (isSuccess && fetchedItems) setItemsForBox(boxId!, fetchedItems); }, [isSuccess, fetchedItems, boxId, setItemsForBox]);
    React.useEffect(() => { if (catSuccess && fetchedCategories) setCategories(fetchedCategories); }, [catSuccess, fetchedCategories, setCategories]);
    React.useEffect(() => { if (boxSuccess && fetchedBoxes) setBoxesForCategory(categoryId!, fetchedBoxes); }, [boxSuccess, fetchedBoxes, categoryId, setBoxesForCategory]);

    // --- データ操作 (Mutation) ---
    const deleteMutation = useMutation({
        mutationFn: (itemId: string) => deleteItem(itemId),
        onSuccess: (_, itemId) => {
            toast.success("アイテムを削除しました。");
            removeItemFromBox(boxId!, itemId); // Zustandストアから即時削除
            queryClient.invalidateQueries({ queryKey: ['items', boxId] }); // キャッシュを無効化
        },
        onError: (err) => toast.error(`削除に失敗しました: ${err.message}`),
        onSettled: () => setDeletingItem(null), // 成功・失敗に関わらず確認モーダルを閉じる
    });

    // --- テーブルの列定義 ---
    const columns = React.useMemo<ColumnDef<ItemResponse>[]>(() => [
        { accessorKey: 'is_finished', header: '状態', cell: ({ row }) => row.original.is_finished ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <XCircleIcon className="h-5 w-5 text-muted-foreground" /> },
        { accessorKey: 'name', header: '復習物名', cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
        {
            id: 'actions', header: '操作', cell: ({ row }) => (
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailItem(row.original)}><DocumentTextIcon className="h-4 w-4" /></Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><EllipsisHorizontalIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setEditingItem(row.original)}>編集</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeletingItem(row.original)}>削除</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )
        },
        { accessorKey: 'learned_date', header: '学習日', cell: ({ row }) => format(new Date(row.original.learned_date), 'yyyy-MM-dd') },
        // 復習日の列を動的に生成
        ...Array.from({ length: Math.max(0, ...items.map(i => i.review_dates.length)) }).map((_, index) => ({
            id: `review_date_${index + 1}`,
            header: `${index + 1}回目`,
            cell: ({ row }: { row: { original: ItemResponse } }) => {
                const reviewDate = row.original.review_dates[index];
                if (!reviewDate) return null;
                const isToday = format(new Date(reviewDate.scheduled_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                    <Button variant={reviewDate.is_completed ? "default" : "outline"} size="sm" className={cn(isToday && !reviewDate.is_completed && "bg-purple-200 text-purple-800 border-purple-400", reviewDate.is_completed && "bg-green-600")} onClick={() => setEditingDate({ item: row.original, reviewDate })}>
                        {format(new Date(reviewDate.scheduled_date), 'MM-dd')}
                    </Button>
                );
            },
        })),
    ], [items, queryClient]); // itemsが変更されたら列定義も再計算

    return (
        <div className="space-y-4">
            <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: currentCategory?.name || '...', href: `/categories/${categoryId}` }, { label: currentBox?.name || 'Box' }]} />
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">{currentBox?.name}</h1>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => openCreateItemModal({ categoryId, boxId })}
                        variant="default"
                    >
                        <PlusCircleIcon className="mr-2 h-5 w-5" />復習物作成
                    </Button>
                    <Button variant="outline" onClick={() => setFinishedItemsModalOpen(true)}>完了済みを確認</Button>
                    <Button variant="ghost" size="icon" onClick={() => setSummaryModalOpen(true)}><InformationCircleIcon className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditBoxModalOpen(true)}><CogIcon className="h-5 w-5" /></Button>
                </div>
            </div>
            <Card>
                <CardContent className="pt-6">
                    {isLoading ? <TableSkeleton /> : <DataTable columns={columns} data={items} />}
                </CardContent>
            </Card>

            {/* --- モーダルコンポーネント群 --- */}
            {detailItem && <ItemDetailModal isOpen={!!detailItem} onClose={() => setDetailItem(null)} item={detailItem} />}
            {editingItem && <EditItemModal isOpen={!!editingItem} onClose={() => setEditingItem(null)} item={editingItem} />}
            {deletingItem && (
                <AlertDialog open={!!deletingItem} onOpenChange={() => setDeletingItem(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>本当に「{deletingItem.name}」を削除しますか？</AlertDialogTitle></AlertDialogHeader>
                        <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
                        <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(deletingItem.item_id)} disabled={deleteMutation.isPending}>
                                {deleteMutation.isPending ? '削除中...' : '削除する'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            {editingDate && <EditReviewDateModal isOpen={!!editingDate} onClose={() => setEditingDate(null)} data={editingDate} />}
            {currentBox && <BoxSummaryModal isOpen={isSummaryModalOpen} onClose={() => setSummaryModalOpen(false)} box={currentBox} itemCount={items.length} />}
            {currentCategory && currentBox && <EditBoxModal isOpen={isEditBoxModalOpen} onClose={() => setEditBoxModalOpen(false)} category={currentCategory} box={currentBox} />}
            <FinishedItemsModal isOpen={isFinishedItemsModalOpen} onClose={() => setFinishedItemsModalOpen(false)} boxId={boxId} categoryId={categoryId} />
        </div>
    );
};

export default BoxPage;