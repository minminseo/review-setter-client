import { PatternResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

type PatternDetailProps = {
    pattern: PatternResponse;
    onEdit?: (pattern: PatternResponse) => void; // 編集ボタンが押されたときのコールバック
    className?: string;
};

/**
 * 復習パターンの詳細をカード形式で表示する再利用可能なコンポーネント。
 * @param pattern - 表示する復習パターンのデータ
 * @param onEdit - (オプション) 編集ボタンを押した際の処理
 */
export const PatternDetail = ({ pattern, onEdit, className }: PatternDetailProps) => {
    const { t } = useTranslation();
    return (
        <Card className={cn("flex flex-col", className)}>
            <CardHeader>
                <CardTitle>{pattern.name}</CardTitle>
                <CardDescription>{t('pattern.weight')}: {t(`pattern.${pattern.target_weight}`)}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                    {t('pattern.steps')} ({t('common.all')}): {pattern.steps.map(s => s.interval_days).join(' | ')}
                </p>
            </CardContent>
            {/* onEdit関数が渡された場合のみ編集ボタンを表示 */}
            {onEdit && (
                <div className="p-4 pt-0">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => onEdit(pattern)}>
                        {t('common.edit')}
                    </Button>
                </div>
            )}
        </Card>
    );
};