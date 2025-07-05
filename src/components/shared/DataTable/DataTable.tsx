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

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    enablePagination?: boolean;
    maxHeight?: string;
    fixedColumns?: number;
    tableWidth?: number;
    resizableColumn?: {
        index: number;
        onResizeStart: (e: React.MouseEvent) => void;
        isResizing: boolean;
        isHovering: boolean;
        onHover: (isHovering: boolean) => void;
    };
}

/**
 * アプリケーション全体で使われる汎用的なデータテーブルコンポーネント。
 * ソート、ページネーション機能を内蔵している。
 * @param columns - テーブルの列定義。
 * @param data - テーブルに表示するデータ配列。
 */
export const DataTable = <TData, TValue>({
    columns,
    data,
    enablePagination = true,
    maxHeight,
    fixedColumns = 0,
    tableWidth,
    resizableColumn,
}: DataTableProps<TData, TValue>) => {
    // テーブルのソート状態を管理
    const [sorting, setSorting] = React.useState<SortingState>([]);

    // テーブルのインスタンスを生成
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
            <div className="h-full flex flex-col ">
                <div
                    className="flex-1 rounded-xl"
                    style={{
                        height: maxHeight === "100%" ? "100%" : maxHeight,
                        maxHeight: maxHeight === "100%" ? "none" : maxHeight,
                    }}
                >
                    <div style={{ width: tableWidth ? `${tableWidth}px` : '100%', minWidth: tableWidth ? `${tableWidth}px` : '800px' }}>
                        <Table style={{ tableLayout: 'fixed', width: tableWidth ? `${tableWidth}px` : '100%' }} >
                            <TableHeader className="sticky top-0 z-30 dark:bg-background ">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header, index) => {
                                            const isFixed = index < fixedColumns;
                                            // カラムのサイズ情報を取得
                                            const columnSize = header.column.columnDef.size;
                                            const width = columnSize ? `${columnSize}px` : '130px';

                                            // 固定カラムの左位置を動的に計算
                                            let leftPosition = '0px';
                                            if (isFixed && index > 0) {
                                                let accumulatedWidth = 0;
                                                for (let i = 0; i < index; i++) {
                                                    const prevColumnSize = headerGroup.headers[i]?.column.columnDef.size;
                                                    accumulatedWidth += prevColumnSize || 130;
                                                }
                                                leftPosition = `${accumulatedWidth}px`;
                                            }

                                            const isResizableColumn = resizableColumn && index === resizableColumn.index;

                                            return (
                                                <TableHead
                                                    key={header.id}
                                                    className={`${isFixed ? 'sticky z-50 bg-background' : ''} `}
                                                    style={{
                                                        position: isFixed ? 'sticky' : 'static',
                                                        zIndex: isFixed ? 50 : undefined,
                                                        borderRight: 'none',
                                                        boxShadow: index === fixedColumns - 1 ? '2px 0 4px rgba(0, 0, 0, 0.1)' : 'none',
                                                        width,
                                                        minWidth: width,
                                                        maxWidth: width,
                                                        left: isFixed ? leftPosition : 'auto'
                                                    }}
                                                >
                                                    {header.isPlaceholder ? null : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {isResizableColumn && (
                                                        <div
                                                            className={`border absolute right-0 top-0 w-1 h-full cursor-col-resize transition-colors z-50 ${resizableColumn.isHovering ? 'bg-blue-500' : 'hover:bg-blue-500'
                                                                }`}
                                                            onMouseDown={resizableColumn.onResizeStart}
                                                            onMouseEnter={() => resizableColumn.onHover(true)}
                                                            onMouseLeave={() => resizableColumn.onHover(false)}
                                                        />
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
                                                // カラムのサイズ情報を取得
                                                const columnSize = cell.column.columnDef.size;
                                                const width = columnSize ? `${columnSize}px` : '130px';

                                                // 固定カラムの左位置を動的に計算
                                                let leftPosition = '0px';
                                                if (isFixed && index > 0) {
                                                    let accumulatedWidth = 0;
                                                    for (let i = 0; i < index; i++) {
                                                        const prevCell = row.getVisibleCells()[i];
                                                        const prevColumnSize = prevCell?.column.columnDef.size;
                                                        accumulatedWidth += prevColumnSize || 130;
                                                    }
                                                    leftPosition = `${accumulatedWidth}px`;
                                                }

                                                const isResizableColumn = resizableColumn && index === resizableColumn.index;

                                                return (
                                                    <TableCell
                                                        key={cell.id}
                                                        className={`${isFixed ? 'sticky z-10 bg-card' : ''} `}
                                                        style={{
                                                            position: isFixed ? 'sticky' : 'static',
                                                            zIndex: isFixed ? 10 : undefined,
                                                            boxShadow: index === fixedColumns - 1 ? '2px 0 4px rgba(0, 0, 0, 0.54)' : 'none',
                                                            width,
                                                            minWidth: width,
                                                            maxWidth: width,
                                                            left: isFixed ? leftPosition : 'auto'
                                                        }}
                                                    >
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        {isResizableColumn && (
                                                            <div
                                                                className={`border absolute right-0 top-0 w-1 h-full cursor-col-resize transition-colors z-10 ${resizableColumn.isHovering ? 'bg-blue-500' : 'hover:bg-blue-500'
                                                                    }`}
                                                                onMouseDown={resizableColumn.onResizeStart}
                                                                onMouseEnter={() => resizableColumn.onHover(true)}
                                                                onMouseLeave={() => resizableColumn.onHover(false)}
                                                            />
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center border-r-0">
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
                className="rounded-md border flex-1  "
                style={{
                    height: maxHeight === "100%" ? "100%" : maxHeight,
                    maxHeight: maxHeight === "100%" ? "none" : maxHeight
                }}
            >
                <div className="h-full  ">
                    <div style={{ display: 'inline-block', minWidth: '100%' }}>
                        <Table style={{ tableLayout: 'fixed', width: 'auto' }}>
                            <TableHeader className="sticky top-0  z-10 border-b ">
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
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="h-24 text-center border-r-0">
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