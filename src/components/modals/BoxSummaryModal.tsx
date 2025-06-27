import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import { useCategoryStore, usePatternStore } from '@/store';
import { fetchPatterns } from '@/api/patternApi';
import { GetBoxOutput } from '@/types';

// UI Components
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

// このモーダルが親コンポーネントから受け取るPropsの型を定義
type BoxSummaryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    box: GetBoxOutput | null; // 表示対象のボックスデータ
    itemCount: number; // ボックス内のアイテム数
};

/**
 * 復習物ボックスの概要（カテゴリー名、アイテム数、適用パターンなど）を表示するモーダル。
 */
export const BoxSummaryModal = ({ isOpen, onClose, box, itemCount }: BoxSummaryModalProps) => {
    // グローバルストアからカテゴリーとパターンの情報を取得
    const { categories } = useCategoryStore();
    const { patterns, setPatterns } = usePatternStore();

    // パターンIDに紐づくパターン情報を取得するためのクエリ
    // パターン情報は頻繁に変わるものではないため、キャッシュを長めに設定
    const { data: fetchedPatterns, isSuccess, isLoading } = useQuery({
        queryKey: ['patterns'],
        queryFn: fetchPatterns,
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: isOpen, // モーダルが開いている場合は常に実行（pattern_idの有無に関わらず）
    });

    // 取得したパターン情報をZustandストアに同期させる
    React.useEffect(() => {
        if (isSuccess && fetchedPatterns) {
            setPatterns(fetchedPatterns);
        }
    }, [isSuccess, fetchedPatterns, setPatterns]);

    // 表示対象のボックスが存在しない場合は、何もレンダリングしない
    if (!box) {
        return null;
    }

    // ボックスIDに紐づくカテゴリー名をストアから検索
    const categoryName = categories.find(c => c.id === box.category_id)?.name || 'N/A';

    // ストアから該当のパターン情報を検索
    const pattern = patterns.length > 0 && box.pattern_id ? patterns.find(p => p.id === box.pattern_id) : null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>復習物ボックス概要</DialogTitle>
                    <DialogDescription>
                        ボックス「{box.name}」の詳細情報
                    </DialogDescription>
                </DialogHeader>
                < div className="space-y-4 py-4 mb-3">
                    <ScrollArea className="flex-1 border-t min-h-0 max-h-[calc(100vh-200px)]">
                        <div className="space-y-4 py-4">
                            <div className="space-y-4 py-4">
                                {/* カテゴリー名 */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">&lt;カテゴリー名&gt;</h4>
                                    <p className="font-semibold">{categoryName}</p>
                                </div>

                                {/* ボックス名 */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">&lt;ボックス名&gt;</h4>
                                    <p className="font-semibold">{box.name}</p>
                                </div>

                                {/* アイテム数 */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">&lt;進行中の復習物数&gt;</h4>
                                    <p className="font-semibold">{itemCount}</p>
                                </div>

                                <Separator />

                                {/* 復習パターン情報 */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">&lt;復習パターン&gt;</h4>
                                    <div className="mt-2 rounded-md border bg-muted p-4">
                                        {box.pattern_id ? (
                                            isLoading ? (
                                                // データ取得中の場合
                                                <div className="space-y-2">
                                                    <Skeleton className="h-5 w-3/4" />
                                                    <Skeleton className="h-5 w-1/2" />
                                                </div>
                                            ) : pattern ? (
                                                // パターン情報が見つかった場合
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex">
                                                        <span className="w-28 font-semibold">復習パターン名</span>
                                                        <span className="mx-2">:</span>
                                                        <span>{pattern.name}</span>
                                                    </div>
                                                    <div className="flex">
                                                        <span className="w-28 font-semibold">重み</span>
                                                        <span className="mx-2">:</span>
                                                        <span>{pattern.target_weight}</span>
                                                    </div>
                                                    <div className="flex">
                                                        <span className="w-28 font-semibold">復習ステップ</span>
                                                        <span className="mx-2">:</span>
                                                        <span>{pattern.steps.map(s => s.interval_days).join(' | ')}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                // パターンIDはあるが、パターンが見つからない場合（削除された等）
                                                <p className="text-sm text-muted-foreground">復習パターンが見つかりません（削除済みの可能性があります）。</p>
                                            )
                                        ) : (
                                            // パターンが設定されていない場合
                                            <p className="text-sm text-muted-foreground">復習パターンは設定されていません。</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                    </ScrollArea>
                    <DialogFooter className="justify-end">

                        <div className="flex gap-3 absolute right-3 bottom-3">
                            <Button type="button" variant="outline" onClick={onClose}>
                                閉じる
                            </Button>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};