import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { toast } from 'sonner';

// API関数
import { fetchFinishedItemsByBox, markItemAsUnfinished } from '@/api/itemApi';
// 型定義
import { ItemResponse } from '@/types';
// UIコンポーネント
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/DataTable/DataTable';
import { TableSkeleton } from '@/components/shared/SkeletonLoader';
// 詳細表示用にItemDetailModalをインポート
import { ItemDetailModal } from './ItemDetailModal';

type FinishedItemsModalProps = {
    isOpen: boolean;
    onClose: () => void;
    boxId?: string;
    categoryId?: string;
};

/**
 * 完了済みの復習アイテムを一覧表示し、「復習の再開」などの操作を行うモーダル。
 */
export const FinishedItemsModal = ({ isOpen, onClose, boxId, categoryId }: FinishedItemsModalProps) => {
    const queryClient = useQueryClient();
    // 詳細表示モーダルで表示するアイテムを管理するstate
    const [detailItem, setDetailItem] = React.useState<ItemResponse | null>(null);

    const queryKey = ['finishedItems', { boxId, categoryId }];
    const queryFn = () => {
        if (boxId) {
            return fetchFinishedItemsByBox(boxId);
        }
        // TODO: カテゴリーIDや未分類全般の完了済みアイテムを取得するAPI関数もここに追加する
        return Promise.resolve([]);
    };

    const { data: finishedItems = [], isLoading } = useQuery({
        queryKey: queryKey,
        queryFn: queryFn,
        enabled: isOpen,
    });

    const unfinishMutation = useMutation({
        mutationFn: (item: ItemResponse) => {
            const unfinishData = {
                itemId: item.item_id,
                data: {
                    pattern_id: item.pattern_id!,
                    learned_date: item.learned_date,
                    today: format(new Date(), 'yyyy-MM-dd'),
                },
            };
            return markItemAsUnfinished(unfinishData);
        },
        onSuccess: (_, variables) => {
            toast.success(`「${variables.name}」の復習を再開しました。`);
            queryClient.invalidateQueries({ queryKey: queryKey });
            queryClient.invalidateQueries({ queryKey: ['items', variables.box_id] });
            onClose();
        },
        onError: (err: any) => toast.error(`処理に失敗しました: ${err.message}`),
    });

    const columns = React.useMemo<ColumnDef<ItemResponse>[]>(() => [
        {
            id: 'actions',
            header: '操作',
            cell: ({ row }) => (
                <div className='flex gap-2'>
                    <Button size="sm" variant="outline" onClick={() => unfinishMutation.mutate(row.original)}>
                        再開
                    </Button>
                </div>
            ),
        },
        {
            accessorKey: 'name',
            header: '復習物名',
        },
        {
            id: 'detail',
            header: '詳細',
            cell: ({ row }) => (
                <Button variant="ghost" size="icon" onClick={() => setDetailItem(row.original)}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                </Button>
            )
        },
        {
            accessorKey: 'learned_date',
            header: '学習日',
            cell: ({ row }) => format(new Date(row.original.learned_date), 'yyyy-MM-dd'),
        },
    ], [unfinishMutation]);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>完了済み復習物一覧</DialogTitle>
                        <DialogDescription>完了済みのアイテムを確認し、必要に応じて復習を再開できます。</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoading ? <TableSkeleton /> : <DataTable columns={columns} data={finishedItems} />}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>閉じる</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* ItemDetailModalを正しくレンダリングする */}
            <ItemDetailModal isOpen={!!detailItem} onClose={() => setDetailItem(null)} item={detailItem} />
        </>
    );
};