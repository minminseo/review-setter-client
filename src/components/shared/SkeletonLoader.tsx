import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

/**
 * テーブルデータ読み込み中に表示するスケルトンUI。
 * 実際のテーブルと同じような見た目にすることで、ユーザーの体感速度を向上させる。
 * @param columns - 表示する列の数
 * @param rows - 表示する行の数
 */
export const TableSkeleton = ({ columns = 5, rows = 5 }) => (
    <div className="rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    {Array.from({ length: columns }).map((_, i) => (
                        <TableHead key={i}><Skeleton className="h-5 w-24" /></TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRow key={i}>
                        {Array.from({ length: columns }).map((_, j) => (
                            <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);

/**
 * カードリスト形式のデータ読み込み中に表示するスケルトンUI。
 * @param count - 表示するカードの数
 */
export const CardListSkeleton = ({ count = 3 }) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
            <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-4 w-full" />
                </CardContent>
            </Card>
        ))}
    </div>
);