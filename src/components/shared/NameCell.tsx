import React from "react";
import {
    TooltipProvider,
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

// 表データの「復習物名」セルに使う共通コンポーネント（テキストオーバーフロー時に表示するiマーク）
export type NameCellProps = {
    // フルテキスト（復習物名）
    name: string;
    // セルの最大横幅。未指定の場合は動的にカラム幅に追従
    maxWidth?: number;
};

const NameCell = ({ name, maxWidth }: NameCellProps) => {
    const containerRef = React.useRef<HTMLSpanElement>(null);
    const textRef = React.useRef<HTMLSpanElement>(null);
    const [isOverflow, setIsOverflow] = React.useState(false);

    // オーバーフローチェック関数
    const checkOverflow = React.useCallback(() => {
        if (textRef.current) {
            setIsOverflow(textRef.current.scrollWidth > textRef.current.clientWidth);
        }
    }, []);

    // 初回 & name 変更時にオーバーフローチェック
    React.useEffect(() => {
        checkOverflow();
    }, [name, checkOverflow]);

    // ResizeObserverでカラム幅の変更を監視（親コンテナを監視）
    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(() => {
            // 少し遅延してからチェック（DOMの更新を待つ）
            setTimeout(() => {
                checkOverflow();
            }, 0);
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [checkOverflow]);

    return (
        <span
            ref={containerRef}
            className="inline-flex items-center gap-1 w-full"
            style={maxWidth ? { maxWidth } : undefined}
        >
            {/* 短縮表示 */}
            <span
                ref={textRef}
                className="block truncate font-medium flex-1 min-w-0"
            >
                {name}
            </span>

            {/* 省略されているときだけ「i」アイコン */}
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
        </span>
    );
};

export default NameCell;
