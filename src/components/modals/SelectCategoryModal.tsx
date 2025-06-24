import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { InboxIcon } from 'lucide-react';
import { InboxStackIcon } from '@heroicons/react/24/outline';

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

// このモーダルが親コンポーネントから受け取るProps（プロパティ）の型を定義
type SelectCategoryModalProps = {
    isOpen: boolean;    // モーダルが開いているかどうかの状態
    onClose: () => void; // モーダルを閉じるための関数
    onSelect: (category: GetCategoryOutput) => void; // カテゴリーが選択されたときに、その情報を親に渡すための関数
};

/**
 * カテゴリーを一覧表示し、ユーザーに選択させるための汎用モーダル。
 * 復習物作成・編集時や、画面上部のタブ表示が見切れた場合などに使用される。
 */
export const SelectCategoryModal = ({ isOpen, onClose, onSelect }: SelectCategoryModalProps) => {
    // グローバルなZustandストアから、キャッシュされたカテゴリーリストと、それを更新する関数を取得
    const { categories, setCategories } = useCategoryStore();

    // TanStack Query (React Query) v5 を使用してAPIからカテゴリーリストを取得
    const { data: fetchedCategories, isLoading, isSuccess } = useQuery({
        queryKey: ['categories'], // このクエリを一意に識別するためのキー
        queryFn: fetchCategories, // 実際にAPIを叩く関数
        staleTime: 1000 * 60 * 5, // 5分間はキャッシュされたデータを「新鮮」とみなし、再取得しない
        enabled: isOpen, // このモーダルが開いている(isOpenがtrue)時にのみ、APIリクエストを実行する
    });

    // v5の作法: useQueryの副作用（データ取得後の処理）はuseEffect内で行う
    React.useEffect(() => {
        // データ取得が成功し、かつデータが存在する場合
        if (isSuccess && fetchedCategories) {
            // 取得したデータでZustandストアを更新する
            setCategories(fetchedCategories);
        }
    }, [isSuccess, fetchedCategories, setCategories]); // これらの値が変化した時のみ副作用が実行される

    // ユーザーがリスト内のカテゴリーボタンをクリックしたときの処理
    const handleSelect = (category: GetCategoryOutput) => {
        onSelect(category); // 親コンポーネントに選択されたカテゴリーを渡す
        onClose(); // モーダルを閉じる
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>カテゴリー一覧</DialogTitle>
                    <DialogDescription>
                        操作対象のカテゴリーを選択してください。
                    </DialogDescription>
                </DialogHeader>

                <div className="overflow-hidden">
                    <ScrollArea className="w-full h-full max-h-[calc(100vh-240px)] ">
                        {/* カテゴリーリストのコンテナ。ScrollAreaが高さとスクロールを管理する */}
                        <div className="space-y-2 p-1">
                            {isLoading ? (
                                // データ取得中は、ボタンのスケルトンUIを5つ表示する
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
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};