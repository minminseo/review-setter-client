import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { InboxStackIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import { fetchCategories } from '@/api/categoryApi';
import { useCategoryStore } from '@/store';
import { GetCategoryOutput } from '@/types';

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

type SelectCategoryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (category: GetCategoryOutput) => void; // カテゴリーが選択されたときに、その情報を親に渡すための関数
};

/**
 * カテゴリーを一覧表示し、ユーザーに選択させるための汎用モーダル。
 * 復習物作成・編集時や、画面上部のタブ表示が見切れた場合などに使用される。
 */
export const SelectCategoryModal = ({ isOpen, onClose, onSelect }: SelectCategoryModalProps) => {
    const { t } = useTranslation();
    const { categories, setCategories } = useCategoryStore();

    const { data: fetchedCategories, isLoading, isSuccess } = useQuery({
        queryKey: ['categories'],
        queryFn: fetchCategories,
        staleTime: 1000 * 60 * 5,
        enabled: isOpen,
    });

    React.useEffect(() => {
        if (isSuccess && fetchedCategories) {
            setCategories(fetchedCategories);
        }
    }, [isSuccess, fetchedCategories, setCategories]); // これらの値が変化した時のみ副作用が実行される

    // ユーザーがリスト内のカテゴリーボタンをクリックしたときの処理
    const handleSelect = (category: GetCategoryOutput) => {
        onSelect(category); // 親コンポーネントに選択されたカテゴリーを渡す
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t('category.selectCategoryModalTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('category.selectCategoryModalDescription')}
                    </DialogDescription>
                </DialogHeader>

                <div className="overflow-hidden">
                    <ScrollArea className="w-full h-full max-h-[calc(100vh-240px)] ">
                        {/* カテゴリーリストのコンテナ。ScrollAreaが高さとスクロールを管理する */}
                        <div className="space-y-2 p-1">
                            {isLoading ? (
                                // データ取得中は、ボタンのスケルトンを表示する
                                Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-10 w-full" />
                                ))
                            ) : (
                                // 取得したカテゴリーリストをループしてボタンとして表示
                                categories.map((category) => (
                                    <Button
                                        key={category.id}
                                        variant="outline"
                                        className="w-full flex justify-start items-center h-12 py-2 px-3"
                                        onClick={() => handleSelect(category)}
                                    >
                                        <InboxStackIcon className="mr-2 h-5 w-5 shrink-0 text-muted-foreground" />
                                        <span
                                            className="text-left truncate max-w-[24rem] w-full block"
                                            style={{ display: 'block' }}
                                            title={category.name}
                                        >
                                            {category.name}
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