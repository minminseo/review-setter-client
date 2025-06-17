import * as React from 'react';
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    SortingState,
    getSortedRowModel,
} from '@tanstack/react-table';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// DataTableコンポーネントが受け取るPropsの型定義
// TDataはテーブルに表示するデータの型、TValueはセルの値の型（ジェネリクスで柔軟性を持たせる）
interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
}

/**
 * アプリケーション全体で使われる汎用的なデータテーブルコンポーネント。
 * ソート、ページネーション機能を内蔵している。
 * @param columns - テーブルの列定義。`useMemo`でメモ化することが推奨される。
 * @param data - テーブルに表示するデータ配列。
 */
export const DataTable = <TData, TValue>({
    columns,
    data,
}: DataTableProps<TData, TValue>) => {
    // テーブルのソート状態を管理する
    const [sorting, setSorting] = React.useState<SortingState>([]);

    // TanStack Tableのフックを使い、テーブルのインスタンスを生成
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(), // 基本的な行モデルを取得
        getPaginationRowModel: getPaginationRowModel(), // ページネーション用の行モデルを取得
        onSortingChange: setSorting, // ソート状態が変更されたらstateを更新
        getSortedRowModel: getSortedRowModel(), // ソート用の行モデルを取得
        state: {
            sorting, // 現在のソート状態をテーブルに渡す
        },
    });

    return (
        <div className="space-y-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {/* ヘッダーグループをループしてヘッダー行（<th>）を生成 */}
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {/* 各ヘッダーセルの中身（コンポーネント）をレンダリング */}
                                            {header.isPlaceholder ? null : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            // データ行をループしてボディ行（<td>）を生成
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {/* 各ボディセルの中身（コンポーネント）をレンダリング */}
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            // データがない場合は「No results」と表示
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No results.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

        </div>
    );
};