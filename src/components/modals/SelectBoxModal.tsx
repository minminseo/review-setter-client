import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchBoxes } from '@/api/boxApi';
import { useBoxStore } from '@/store';
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
import { Skeleton } from '@/components/ui/skeleton';

// このモーダルが親コンポーネントから受け取るPropsの型を定義
type SelectBoxModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (box: GetBoxOutput) => void;
    categoryId: string | null | undefined; // どのカテゴリーのボックスを表示するかのID
};

/**
 * 特定のカテゴリーに属するボックスを一覧表示し、ユーザーに選択させるための汎用モーダル。
 * このモーダルの表示内容は、propsで渡される`categoryId`に依存して動的に変わる。
 */
export const SelectBoxModal = ({ isOpen, onClose, onSelect, categoryId }: SelectBoxModalProps) => {
    // グローバルなZustandストアから、特定のカテゴリーに属するボックスリストを取得するセレクター関数と、
    // ボックスリストを更新するためのセッター関数を取得する
    const { getBoxesForCategory, setBoxesForCategory } = useBoxStore();
    const boxes = getBoxesForCategory(categoryId || '');

    // 特定カテゴリーのボックスリストを取得するためのReact Query
    const { data: fetchedBoxes, isLoading, isSuccess } = useQuery({
        // クエリキーに`categoryId`を含めることで、カテゴリーごとにキャッシュを管理する
        queryKey: ['boxes', categoryId],
        queryFn: () => fetchBoxes(categoryId!), // categoryIdがnullでないことを!でTypeScriptに伝える
        // モーダルが開いていて、かつcategoryIdが指定されている場合にのみAPIリクエストを実行
        enabled: isOpen && !!categoryId,
        staleTime: 1000 * 60 * 5, // 5分間はキャッシュを有効にする
    });

    // データ取得成功時に、その結果をZustandストアに同期させる副作用
    React.useEffect(() => {
        if (isSuccess && fetchedBoxes && categoryId) {
            setBoxesForCategory(categoryId, fetchedBoxes);
        }
    }, [isSuccess, fetchedBoxes, categoryId, setBoxesForCategory]);

    // ユーザーがリスト内のボックスボタンをクリックしたときの処理
    const handleSelect = (box: GetBoxOutput) => {
        onSelect(box); // 親コンポーネントに選択されたボックス情報を渡す
        onClose();      // モーダルを閉じる
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>ボックス一覧</DialogTitle>
                    <DialogDescription>
                        操作対象のボックスを選択してください。
                    </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto space-y-2 p-1">
                    {!categoryId ? (
                        // カテゴリーがまだ選択されていない場合の表示
                        <p className="text-sm text-muted-foreground text-center py-4">
                            先にカテゴリーを選択してください。
                        </p>
                    ) : isLoading ? (
                        // データ取得中のスケルトン表示
                        Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-full" />
                        ))
                    ) : (
                        // ボックスリストの表示
                        boxes?.map((box) => (
                            <Button
                                key={box.id}
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => handleSelect(box)}
                            >
                                {box.name}
                            </Button>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={onClose}>
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};