import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>カテゴリー一覧</DialogTitle>
                    <DialogDescription>
                        操作対象のカテゴリーを選択してください。
                    </DialogDescription>
                </DialogHeader>

                {/* カテゴリーリストのコンテナ。高さが固定され、内容が多ければスクロールバーが表示される */}
                <div className="max-h-[60vh] overflow-y-auto space-y-2 p-1">
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
                                className="w-full justify-start"
                                onClick={() => handleSelect(category)}
                            >
                                {category.name}
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