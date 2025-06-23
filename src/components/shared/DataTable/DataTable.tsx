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
    enablePagination?: boolean; // ページングを有効にするかどうか
    maxHeight?: string; // テーブルの最大高さ（縦スクロール用）
    fixedColumns?: number; // 左側に固定するカラム数
    tableWidth?: number; // テーブルの全体幅
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
    enablePagination = true,
    maxHeight,
    fixedColumns = 0,
    tableWidth,
}: DataTableProps<TData, TValue>) => {
    // テーブルのソート状態を管理する
    const [sorting, setSorting] = React.useState<SortingState>([]);

    // TanStack Tableのフックを使い、テーブルのインスタンスを生成
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(), // 基本的な行モデルを取得
        ...(enablePagination && { getPaginationRowModel: getPaginationRowModel() }), // ページングが有効な場合のみ追加
        onSortingChange: setSorting, // ソート状態が変更されたらstateを更新
        getSortedRowModel: getSortedRowModel(), // ソート用の行モデルを取得
        state: {
            sorting, // 現在のソート状態をテーブルに渡す
        },
    });



    // 固定カラムが指定されている場合の処理
    if (fixedColumns > 0) {

        return (
            <div className="h-full flex flex-col">
                <div
                    className="flex-1 rounded-lg border"
                    style={{
                        height: maxHeight === "100%" ? "100%" : maxHeight,
                        maxHeight: maxHeight === "100%" ? "none" : maxHeight,
                        overflow: 'auto'
                    }}
                >
                    <div style={{ width: tableWidth ? `${tableWidth}px` : '100%', minWidth: tableWidth ? `${tableWidth}px` : '800px' }}>
                        <Table style={{ tableLayout: 'fixed', width: '100%' }}>
                            <TableHeader className="sticky top-0 bg-background z-10 ">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header, index) => {
                                            const isFixed = index < fixedColumns;
                                            const width = index === 0 ? '60px' : // 状態
                                                index === 1 ? '50px' : // 操作
                                                    index === 2 ? '150px' : // 復習物名
                                                        index === 3 ? '50px' : // 詳細
                                                            index === 4 ? '100px' : // 学習日
                                                                '130px'; // 回数カラム
                                            return (
                                                <TableHead
                                                    key={header.id}
                                                    className={`${isFixed ? 'sticky z-20' : ''} ${!isFixed ? 'border-l-0' : ''}`}
                                                    style={{
                                                        position: isFixed ? 'sticky' : 'static',
                                                        backgroundColor: isFixed ? '#000000' : 'transparent',
                                                        borderRight: index === fixedColumns - 1 ? '2px solid hsl(var(--border))' : 'none',
                                                        borderLeft: !isFixed ? 'none' : undefined,
                                                        boxShadow: index === fixedColumns - 1 ? '2px 0 4px rgba(0, 0, 0, 0.1)' : 'none',
                                                        width,
                                                        minWidth: width,
                                                        maxWidth: width,
                                                        left: isFixed ?
                                                            (index === 0 ? '0px' :
                                                                index === 1 ? '60px' :
                                                                    index === 2 ? '110px' :
                                                                        index === 3 ? '260px' :
                                                                            index === 4 ? '310px' :
                                                                                `${410 + (index - 5) * 130}px`) : 'auto'
                                                    }}
                                                >
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
                                    table.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id}>
                                            {row.getVisibleCells().map((cell, index) => {
                                                const isFixed = index < fixedColumns;
                                                const width = index === 0 ? '60px' : // 状態
                                                    index === 1 ? '50px' : // 操作
                                                        index === 2 ? '150px' : // 復習物名
                                                            index === 3 ? '50px' : // 詳細
                                                                index === 4 ? '100px' : // 学習日
                                                                    '130px'; // 回数カラム
                                                return (
                                                    <TableCell
                                                        key={cell.id}
                                                        className={`${isFixed ? 'sticky z-10' : ''} ${!isFixed ? 'border-l-0' : ''}`}
                                                        style={{
                                                            position: isFixed ? 'sticky' : 'static',
                                                            backgroundColor: isFixed ? '#000000' : 'transparent',
                                                            borderRight: index === fixedColumns - 1 ? '2px solid hsl(var(--border))' : 'none',
                                                            borderLeft: !isFixed ? 'none' : undefined,
                                                            boxShadow: index === fixedColumns - 1 ? '2px 0 4px rgba(0, 0, 0, 0.1)' : 'none',
                                                            width,
                                                            minWidth: width,
                                                            maxWidth: width,
                                                            left: isFixed ?
                                                                (index === 0 ? '0px' :
                                                                    index === 1 ? '60px' :
                                                                        index === 2 ? '110px' :
                                                                            index === 3 ? '260px' :
                                                                                index === 4 ? '310px' :
                                                                                    `${410 + (index - 5) * 130}px`) : 'auto'
                                                        }}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))
                                ) : (
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
            </div>
        );
    }

    // 固定カラムが指定されていない場合は従来の表示
    return (
        <div className="h-full flex flex-col">
            <div
                className="rounded-md border flex-1 overflow-hidden "
                style={{
                    height: maxHeight === "100%" ? "100%" : maxHeight,
                    maxHeight: maxHeight === "100%" ? "none" : maxHeight
                }}
            >
                <div className="h-full overflow-auto ">
                    <div style={{ display: 'inline-block', minWidth: '100%' }}>
                        <Table style={{ tableLayout: 'fixed', width: 'auto' }}>
                            <TableHeader className="sticky top-0 bg-background z-10 border-b ">
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
            </div>
        </div>
    );
};