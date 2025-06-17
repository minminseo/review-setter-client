import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchPatterns } from '@/api/patternApi';
import { usePatternStore } from '@/store';
import { PatternResponse } from '@/types';

// Shared Components
import { CardListSkeleton } from '@/components/shared/SkeletonLoader';
import { PatternDetail } from '@/components/shared/PatternDetail';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { SortDropdown } from '@/components/shared/SortDropdown';

// Modals
import { EditPatternModal } from '@/components/modals/EditPatternModal';

/**
 * 復習パターンを一覧で表示・管理するためのページ。
 * ホームページやサイドバーから遷移してくる。
 */
const PatternsPage = () => {
    console.log('PatternsPage component rendered'); // デバッグ用ログ

    // グローバルなZustandストアからパターンリストとセッター関数を取得
    const { patterns, setPatterns } = usePatternStore();

    // 編集モーダルを開くために、どのパターンを編集中か管理するstate
    const [editingPattern, setEditingPattern] = React.useState<PatternResponse | null>(null);
    // リストの並び順を管理するstate
    const [sortOrder, setSortOrder] = React.useState('name_asc');

    // APIからパターンリストを取得するためのReact Query
    const { data: fetchedPatterns, isLoading, isSuccess, error } = useQuery({
        queryKey: ['patterns'],
        queryFn: fetchPatterns,
        staleTime: 1000 * 60 * 5, // 5分間はキャッシュを有効にする
        retry: 1, // 1回だけリトライする
        refetchOnMount: true, // マウント時に必ず実行
        refetchOnWindowFocus: false, // ウィンドウフォーカス時の再取得を無効化
    });

    console.log('PatternsPage state:', { isLoading, isSuccess, error, fetchedPatterns, patterns }); // デバッグ用ログ

    // データ取得成功時に、Zustandストアの状態を更新する
    React.useEffect(() => {
        if (isSuccess && fetchedPatterns) {
            setPatterns(fetchedPatterns);
        }
    }, [isSuccess, fetchedPatterns, setPatterns]);

    // 編集ボタンが押されたときに、対象のパターンをstateにセットしてモーダルを開く
    const handleEdit = (pattern: PatternResponse) => {
        setEditingPattern(pattern);
    };

    // 表示用のパターンリスト。ソート状態に応じて並び替えを行う。
    // 一時的にuseMemoを削除してテスト
    const sortedPatterns = patterns || [];


    return (
        <div className="space-y-4">
            {/* ページのヘッダー部分 */}
            <div className="flex items-center justify-between">
                <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: '復習パターン一覧' }]} />
                <SortDropdown
                    options={[
                        { value: 'name_asc', label: '名前 (昇順)' },
                        { value: 'name_desc', label: '名前 (降順)' },
                    ]}
                    value={sortOrder}
                    onValueChange={setSortOrder}
                />
            </div>

            <h1 className="text-2xl font-bold tracking-tight">復習パターン一覧</h1>



            {/* メインコンテンツ */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {isLoading ? (
                    // ローディング中はスケルトンUIを表示
                    <CardListSkeleton count={4} />
                ) : error ? (
                    // エラーが発生した場合
                    <div className="col-span-full text-center py-8">
                        <p className="text-red-500">データの読み込みに失敗しました。</p>
                        <p className="text-sm text-muted-foreground mt-2">エラー: {String(error)}</p>
                        <p className="text-sm text-muted-foreground mt-2">ページを再読み込みしてください。</p>
                    </div>
                ) : sortedPatterns.length === 0 ? (
                    // データが空の場合
                    <div className="col-span-full text-center py-8">
                        <p className="text-muted-foreground">復習パターンがありません。</p>
                        <p className="text-xs text-gray-400 mt-2">API呼び出しが成功したが、データが空です。</p>
                        <p className="text-xs text-gray-400 mt-1">サイドバーの「復習パターンを作成」ボタンから新しいパターンを作成できます。</p>
                    </div>
                ) : (
                    // 取得したパターンをループして表示
                    sortedPatterns.map((pattern) => (
                        <PatternDetail
                            key={pattern.id}
                            pattern={pattern}
                            onEdit={handleEdit} // 編集ボタンが押されたときの処理を渡す
                        />
                    ))
                )}
            </div>

            {/* 編集モーダル。editingPatternにデータがあるときだけ表示される。 */}
            {editingPattern && (
                <EditPatternModal
                    isOpen={!!editingPattern}
                    onClose={() => setEditingPattern(null)}
                    pattern={editingPattern}
                />
            )}
        </div>
    );
};

export default PatternsPage;