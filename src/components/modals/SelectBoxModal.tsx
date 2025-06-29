import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { InboxIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

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
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

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
    const { t } = useTranslation();
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
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('box.selectBoxModalTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('box.selectBoxModalDescription')}
                    </DialogDescription>
                </DialogHeader>
                <div className="overflow-hidden">
                    <ScrollArea className="w-full h-full max-h-[calc(100vh-240px)] ">
                        <div className="space-y-2 p-1">
                            {!categoryId ? (
                                // カテゴリーがまだ選択されていない場合の表示
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    {t('box.selectCategoryFirst')}
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
                                        className="w-full flex justify-start items-center h-12 py-2 px-3"
                                        onClick={() => handleSelect(box)}
                                    >
                                        <InboxIcon className="mr-2 h-5 w-5 shrink-0 text-muted-foreground" />
                                        <span
                                            className="text-left truncate max-w-[24rem] w-full block"
                                            style={{ display: 'block' }}
                                            title={box.name}
                                        >
                                            {box.name}
                                        </span>
                                    </Button>
                                ))
                            )}
                        </div>
                        <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                    </ScrollArea>
                </div>
                <DialogFooter className="w-full justify-end">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        {t('common.close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};