import { Column } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowDownIcon, ArrowUpIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline';

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>;
    title: string;
}

/**
 * クリックすることでソート機能が有効になるテーブルヘッダーコンポーネント。
 * @param column - TanStack Tableのcolumnインスタンス。ソート状態や操作を持つ。
 * @param title - 表示する列のタイトル。
 */
export const DataTableColumnHeader = <TData, TValue>({
    column,
    title,
    className,
}: DataTableColumnHeaderProps<TData, TValue>) => {
    // 列定義でソートが無効化されている場合は、単にテキストを表示する
    if (!column.getCanSort()) {
        return <div className={cn(className)}>{title}</div>;
    }

    return (
        <div className={cn('flex items-center space-x-2', className)}>
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
                <span>{title}</span>
                {/* ソートの状態に応じて昇順・降順・無しのアイコンを切り替える */}
                {column.getIsSorted() === 'desc' ? (
                    <ArrowDownIcon className="ml-2 h-4 w-4" />
                ) : column.getIsSorted() === 'asc' ? (
                    <ArrowUpIcon className="ml-2 h-4 w-4" />
                ) : (
                    <ChevronUpDownIcon className="ml-2 h-4 w-4" />
                )}
            </Button>
        </div>
    );
};