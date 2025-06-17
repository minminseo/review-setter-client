import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface DataTablePaginationProps<TData> {
    table: Table<TData>;
}

/**
 * DataTable用のページネーションUI（前へ/次へボタン）コンポーネント。
 * @param table - TanStack Tableのtableインスタンス。ページ状態や操作を持つ。
 */
export const DataTablePagination = <TData,>({ table }: DataTablePaginationProps<TData>) => {
    return (
        <div className="flex items-center justify-end space-x-2 py-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()} // 前のページがなければボタンを無効化
            >
                <ChevronLeftIcon className="h-4 w-4 mr-1" />
                Previous
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()} // 次のページがなければボタンを無効化
            >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
        </div>
    );
};