import { ItemResponse } from '@/types';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

type ItemDetailModalProps = {
    isOpen: boolean;
    onClose: () => void;
    item: ItemResponse | null; // 表示対象の復習物データ。nullの場合は何も表示しない。
};

/**
 * 復習物の詳細表示モーダル。
 * このモーダル自身はAPIを叩かず、親コンポーネントから表示するデータをpropsとして受け取る。
 */
export const ItemDetailModal = ({ isOpen, onClose, item }: ItemDetailModalProps) => {
    const { t } = useTranslation();

    if (!item) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('item.detail')}</DialogTitle>
                    <DialogDescription>
                        {item.name}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 mb-3">
                    <ScrollArea className="flex-1 border-t min-h-0 max-h-[calc(100vh-200px)]">
                        <div className="py-4 mb-3">
                            <h4 className="text-sm font-semibold mb-2">{t('item.detail')}</h4>
                            <div className="p-4 bg-muted rounded-md min-h-[100px] text-sm text-muted-foreground whitespace-pre-wrap">
                                {item.detail || t('item.noDetail')}
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