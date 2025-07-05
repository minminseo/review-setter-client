import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { fetchPatterns } from '@/api/patternApi';
import { usePatternStore } from '@/store';
import { PatternResponse } from '@/types';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { CardListSkeleton } from '@/components/shared/SkeletonLoader';
import { CreatePatternModal } from './CreatePatternModal'; // 追加
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

type SelectPatternModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (pattern: PatternResponse) => void;
};

// パターンを一覧表示し、ユーザーに選択させるための汎用モーダル
export const SelectPatternModal = ({ isOpen, onClose, onSelect }: SelectPatternModalProps) => {
    const { t } = useTranslation();
    const { patterns, setPatterns } = usePatternStore();

    const { data: fetchedPatterns, isLoading, isSuccess } = useQuery({
        queryKey: ['patterns'],
        queryFn: fetchPatterns,
        staleTime: 1000 * 60 * 5,
        enabled: isOpen,
    });

    React.useEffect(() => {
        if (isSuccess && fetchedPatterns) {
            setPatterns(fetchedPatterns);
        }
    }, [isSuccess, fetchedPatterns, setPatterns]);

    // ユーザーがリスト内のパターンカードをクリックしたときの処理
    const handleSelect = (pattern: PatternResponse) => {
        onSelect(pattern); // 親に選択されたパターンを渡す
        onClose();      // モーダルを閉じる
    };

    // CreatePatternModalのopen状態
    const [isCreateOpen, setCreateOpen] = React.useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('pattern.selectPatternModalTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('pattern.selectPatternModalDescription')}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="w-full h-full max-h-[calc(100vh-240px)] border-t border-b">
                    <div className="max-h-[60vh]  space-y-3 p-1">
                        {isLoading ? (
                            <CardListSkeleton count={6} />
                        ) : patterns.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground">{t('pattern.noPatterns')}</p>
                                <p className="text-sm text-muted-foreground mt-2">{t('pattern.createPatternFirst')}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                {patterns.map((pattern) => (
                                    <div
                                        key={pattern.id}
                                        className="cursor-pointer hover:bg-accent transition-colors"
                                        onClick={() => handleSelect(pattern)}
                                    >
                                        <div className="rounded-md border bg-muted p-2 space-y-2 text-sm">
                                            <div className="flex">
                                                <span className="w-28 font-semibold">{t('pattern.name')}</span>
                                                <span className="mx-2">:</span>
                                                <span>{pattern.name}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-28 font-semibold">{t('pattern.weight')}</span>
                                                <span className="mx-2">:</span>
                                                <span>{pattern.target_weight}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-28 font-semibold">{t('pattern.steps')}</span>
                                                <span className="mx-2">:</span>
                                                <span>{pattern.steps.map(s => s.interval_days).join(' | ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <ScrollBar orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />
                </ScrollArea>
                <DialogFooter>
                    <div className="w-full flex flex-row items-center justify-between">
                        <Button type="button" variant="secondary" onClick={() => setCreateOpen(true)}>
                            {t('pattern.create')}
                        </Button>
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t('common.close')}
                        </Button>
                    </div>
                </DialogFooter>
                <CreatePatternModal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} />
            </DialogContent>
        </Dialog>
    );
};