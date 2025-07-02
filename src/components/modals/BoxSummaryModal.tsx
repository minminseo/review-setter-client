import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

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
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

type BoxSummaryModalProps = {
    isOpen: boolean;
    onClose: () => void;
    box: GetBoxOutput | null;
    itemCount: number;
};

export const BoxSummaryModal = ({ isOpen, onClose, box, itemCount }: BoxSummaryModalProps) => {
    const { t } = useTranslation();
    const { categories } = useCategoryStore();
    const { patterns, setPatterns } = usePatternStore();

    const { data: fetchedPatterns, isSuccess, isLoading } = useQuery({
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

    if (!box) {
        return null;
    }

    const categoryName = categories.find(c => c.id === box.category_id)?.name || t('category.unclassified');
    const pattern = patterns.length > 0 && box.pattern_id ? patterns.find(p => p.id === box.pattern_id) : null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('box.overview')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 mb-3">
                    <ScrollArea className="flex-1 border-t min-h-0 max-h-[calc(100vh-200px)]">
                        <div className="space-y-4 py-4">
                            <div className="space-y-4 py-4">
                                {/* カテゴリー名 */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">{t('category.name')}</h4>
                                    <p className="font-semibold">{categoryName}</p>
                                </div>
                                {/* ボックス名 */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">{t('box.name')}</h4>
                                    <p className="font-semibold">{box.name}</p>
                                </div>
                                {/* アイテム数 */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">{t('box.itemCount')}</h4>
                                    <p className="font-semibold">{itemCount}</p>
                                </div>
                                <Separator />
                                {/* 復習パターン情報 */}
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">{t('pattern.reviewPattern')}</h4>
                                    <div className="mt-2 rounded-md border bg-muted p-4">
                                        {box.pattern_id ? (
                                            isLoading ? (
                                                <div className="space-y-2">
                                                    <Skeleton className="h-5 w-3/4" />
                                                    <Skeleton className="h-5 w-1/2" />
                                                </div>
                                            ) : pattern ? (
                                                <div className="space-y-2 text-sm">
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
                                            ) : (
                                                <p className="text-sm text-muted-foreground">{t('pattern.noPatterns')}</p>
                                            )
                                        ) : (
                                            <p className="text-sm text-muted-foreground">{t('pattern.unset')}</p>
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
                                {t('common.close')}
                            </Button>
                        </div>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};
