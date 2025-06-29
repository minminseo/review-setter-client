import { ItemResponse } from '@/types';
import { useTranslation } from 'react-i18next';

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
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

// このモーダルが親コンポーネントから受け取るPropsの型を定義
type ItemDetailModalProps = {
    isOpen: boolean;    // モーダルが開いているかどうかの状態
    onClose: () => void; // モーダルを閉じるための関数
    item: ItemResponse | null; // 表示対象のアイテムデータ。nullの場合は何も表示しない。
};

/**
 * 復習物アイテムの詳細情報（`detail`フィールド）を表示するための読み取り専用モーダル。
 * このモーダル自身はAPIを叩かず、親コンポーネントから表示するデータをpropsとして受け取る。
 */
export const ItemDetailModal = ({ isOpen, onClose, item }: ItemDetailModalProps) => {
    const { t } = useTranslation();

    // 表示対象のアイテムが存在しない場合は、何もレンダリングしない
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