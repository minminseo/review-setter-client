import { ItemResponse } from '@/types';

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
    // 表示対象のアイテムが存在しない場合は、何もレンダリングしない
    if (!item) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>復習物詳細</DialogTitle>
                    <DialogDescription>
                        {item.name}
                    </DialogDescription>
                </DialogHeader>

                {/* 詳細情報を表示するメインコンテンツエリア */}
                <div className="py-4">
                    <h4 className="text-sm font-semibold mb-2">詳細</h4>
                    <div className="p-4 bg-muted rounded-md min-h-[100px] text-sm text-muted-foreground whitespace-pre-wrap">
                        {/* item.detailが存在すればそれを表示し、なければプレースホルダーテキストを表示 */}
                        {item.detail || '詳細情報はありません。'}
                    </div>
                </div>

                <DialogFooter>
                    {/* デザイン案では「作成」となっていたが、表示用モーダルのため「閉じる」ボタンを配置 */}
                    <Button type="button" variant="outline" onClick={onClose}>
                        閉じる
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};