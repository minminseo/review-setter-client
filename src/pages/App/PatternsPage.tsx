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
    // グローバルなZustandストアからパターンリストとセッター関数を取得
    const { patterns, setPatterns } = usePatternStore();

    // 編集モーダルを開くために、どのパターンを編集中か管理するstate
    const [editingPattern, setEditingPattern] = React.useState<PatternResponse | null>(null);
    // リストの並び順を管理するstate
    const [sortOrder, setSortOrder] = React.useState('name_asc');

    // APIからパターンリストを取得するためのReact Query
    const { data: fetchedPatterns, isLoading, isSuccess } = useQuery({
        queryKey: ['patterns'],
        queryFn: fetchPatterns,
        staleTime: 1000 * 60 * 5, // 5分間はキャッシュを有効にする
    });

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
    // useMemoを使うことで、sortOrderかpatternsが変わらない限り再計算されないように最適化。
    const sortedPatterns = React.useMemo(() => {
        const sortable = [...patterns];
        // TODO: ここに実際のソートロジックを追加する
        // if (sortOrder === 'name_asc') { ... }
        return sortable;
    }, [patterns, sortOrder]);


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