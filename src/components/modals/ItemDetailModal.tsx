import { ItemResponse } from '@/types';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useState } from 'react';

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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

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
    const [isHovered, setIsHovered] = useState(false);

    if (!item) {
        return null;
    }

    const handleCopyDetail = async () => {
        if (!item.detail) return;

        try {
            await navigator.clipboard.writeText(item.detail);
            toast.success(t('common.copy'));
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-w-[90vw]">
                <DialogHeader>
                    <DialogTitle>{t('item.detail')}</DialogTitle>
                    <DialogDescription>
                        {item.name}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 mb-3">
                    <ScrollArea className="flex-1 border-t min-h-0 max-h-[calc(100vh-200px)]">
                        <div className="py-4 mb-3">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-semibold">{t('item.detail')}</h4>
                                {item.detail && (
                                    <TooltipProvider>
                                        <Tooltip open={isHovered}>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleCopyDetail}
                                                    className="h-8 w-8 p-0"
                                                    onMouseEnter={() => setIsHovered(true)}
                                                    onMouseLeave={() => setIsHovered(false)}
                                                >
                                                    <DocumentDuplicateIcon className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{t('common.copy')}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <div className="p-4 bg-muted rounded-md min-h-[100px]">
                                <div className="prose prose-sm max-w-none text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:ml-0 [&_ul_li]:marker:text-muted-foreground [&_ol_li]:marker:text-muted-foreground leading-relaxed [&_p]:leading-relaxed [&_li]:leading-relaxed">
                                    <ReactMarkdown>
                                        {item.detail || t('item.noDetail')}
                                    </ReactMarkdown>
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