import React from "react";
import {
    TooltipProvider,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

/**
 * 表データの「復習物名」セルに使う共通コンポーネント。
 * - 文字列が列幅を超える場合は `truncate` で省略表示。
 * - 省略された場合のみ ℹ︎ アイコンを表示し、ホバーで全文をツールチップ表示する。
 */
export type NameCellProps = {
    /** フルテキスト（復習物名） */
    name: string;
    /** セルの最大横幅 (px)。デフォルト 200 */
    maxWidth?: number;
};

// React.FC は使わずアロー関数で定義
const NameCell = ({ name, maxWidth = 200 }: NameCellProps) => {
    const textRef = React.useRef<HTMLSpanElement>(null);
    const [isOverflow, setIsOverflow] = React.useState(false);

    // 初回 & name 変更時にオーバーフローチェック
    React.useEffect(() => {
        if (textRef.current) {
            setIsOverflow(textRef.current.scrollWidth > textRef.current.clientWidth);
        }
    }, [name]);

    return (
        <div className="flex items-center gap-1" style={{ maxWidth }}>
            {/* 短縮表示 */}
            <span
                ref={textRef}
                className="block truncate font-medium max-w-full"
                style={{ maxWidth }}
            >
                {name}
            </span>

            {/* 省略されているときだけ情報アイコン */}
            {isOverflow && (
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                            >
                                <InformationCircleIcon className="h-4 w-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs break-words">
                            {name}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
        </div>
    );
};

export default NameCell;
