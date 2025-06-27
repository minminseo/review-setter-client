import * as React from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchPatterns } from '@/api/patternApi';
import { usePatternStore } from '@/store';
import { PatternResponse } from '@/types';

// Shared Components
import { CardListSkeleton } from '@/components/shared/SkeletonLoader';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { SortDropdown } from '@/components/shared/SortDropdown';

// Modals
import { EditPatternModal } from '@/components/modals/EditPatternModal';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

    // 並び順の選択肢を拡張
    const sortOptions = [
        { value: 'name_asc', label: '名前 (昇順)' },
        { value: 'name_desc', label: '名前 (降順)' },
        { value: 'registered_at_desc', label: '作成順 (新しい順)' },
        { value: 'registered_at_asc', label: '作成順 (古い順)' },
        { value: 'edited_at_desc', label: '更新順 (新しい順)' },
        { value: 'edited_at_asc', label: '更新順 (古い順)' },
    ];

    // 並び順に応じてpatternsをソート
    const sortedPatterns = React.useMemo(() => {
        if (!patterns) return [];
        const arr = [...patterns];
        switch (sortOrder) {
            case 'name_asc':
                return arr.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
            case 'name_desc':
                return arr.sort((a, b) => b.name.localeCompare(a.name, 'ja'));
            case 'registered_at_desc':
                return arr.sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime());
            case 'registered_at_asc':
                return arr.sort((a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime());
            case 'edited_at_desc':
                return arr.sort((a, b) => new Date(b.edited_at).getTime() - new Date(a.edited_at).getTime());
            case 'edited_at_asc':
                return arr.sort((a, b) => new Date(a.edited_at).getTime() - new Date(b.edited_at).getTime());
            default:
                return arr;
        }
    }, [patterns, sortOrder]);

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* ページのヘッダー部分 */}
            <div className="flex items-center justify-between flex-shrink-0">
                <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: '復習パターン一覧' }]} />
                <SortDropdown
                    options={sortOptions}
                    value={sortOrder}
                    onValueChange={setSortOrder}
                />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-center flex-shrink-0">復習パターン一覧</h1>

            {/* メインコンテンツ */}
            <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full flex-1 min-h-0">
                {isLoading ? (
                    <CardListSkeleton count={4} />
                ) : error ? (
                    <div className="text-center py-8">
                        <p className="text-red-500">データの読み込みに失敗しました。</p>
                        <p className="text-sm text-muted-foreground mt-2">エラー: {String(error)}</p>
                        <p className="text-sm text-muted-foreground mt-2">ページを再読み込みしてください。</p>
                    </div>
                ) : sortedPatterns.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-muted-foreground">復習パターンがありません。</p>
                        <p className="text-xs text-gray-400 mt-2">API呼び出しが成功したが、データが空です。</p>
                        <p className="text-xs text-gray-400 mt-1">サイドバーの「復習パターンを作成」ボタンから新しいパターンを作成できます。</p>
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 relative">
                        <ScrollArea className="h-full w-full border-t border-b">
                            <div className="flex flex-col gap-4 p-2">
                                {sortedPatterns.map((pattern) => (
                                    <div
                                        key={pattern.id}
                                        className="rounded-xl bg-muted border p-4 space-y-2 text-sm flex flex-col md:flex-row md:items-center md:justify-between shadow hover:bg-accent transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center">
                                                <span className="w-32 font-semibold">復習パターン名</span>
                                                <span className="mx-2">:</span>
                                                <span className="font-bold text-lg">{pattern.name}</span>
                                            </div>

                                            <div className="flex items-center">
                                                <span className="w-32 font-semibold">重み</span>
                                                <span className="mx-2">:</span>
                                                <span>{pattern.target_weight}</span>
                                            </div>
                                            <div className="flex items-center flex-wrap">
                                                <span className="w-32 font-semibold">復習ステップ</span>
                                                <span className="mx-2">:</span>
                                                <span className="break-all">{pattern.steps.map(s => s.interval_days).join(' | ')}</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 md:mt-0 md:ml-4 flex-shrink-0 flex items-center">
                                            <button
                                                className="rounded-md bg-gray-700 text-white px-4 py-2 text-sm font-semibold hover:bg-primary/80 transition-colors"
                                                onClick={() => handleEdit(pattern)}
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                        </ScrollArea>
                    </div>
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