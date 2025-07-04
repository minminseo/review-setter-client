import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

type SortOption = {
    value: string; // "name_asc" のような内部的な値
    label: string; // "名前（昇順）" のようなUI表示用のラベル
};

type SortDropdownProps = {
    options: SortOption[];
    value: string; // 現在選択されているソートの値
    onValueChange: (value: string) => void; // 新しい値が選択されたときのコールバック
    className?: string;
};

/**
 * @param options - ドロップダウンに表示する選択肢の配列
 */
export const SortDropdown = ({ options, value, onValueChange, className }: SortDropdownProps) => {
    // 現在選択されている値から、表示用のラベルを見つける
    const currentLabel = options.find(option => option.value === value)?.label || '並び替え';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className={`flex items-center justify-between px-3 ${className}`}>
                    <span className="flex-1 text-left truncate">{currentLabel}</span>
                    <ChevronDownIcon className="ml-2 h-4 w-4 flex-shrink-0" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {/* 選択肢をループしてメニュー項目を生成 */}
                {options.map((option) => (
                    <DropdownMenuItem key={option.value} onSelect={() => onValueChange(option.value)}>
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};