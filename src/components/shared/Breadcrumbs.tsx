import * as React from 'react';
import { Link } from 'react-router-dom';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// パンくずリストの各項目を表す型定義
type BreadcrumbItemType = {
    label: string;
    href?: string; // hrefがなければ、現在のページとして表示（クリック不可）
};

// Breadcrumbsコンポーネントが受け取るPropsの型定義
type BreadcrumbsProps = {
    items: BreadcrumbItemType[];
};

/**
 * ページの現在位置を示すパンくずリストを表示するコンポーネント。
 * @param items - パンくずリストの各項目（ラベルとリンク先）の配列
 * @returns レスポンシブ対応されたパンくずリストUI
 */
const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
    return (
        // md（中画面）以上で表示される
        <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
                {items.map((item, index) => {
                    const displayLabel =
                        item.label.length > 20
                            ? item.label.slice(0, 20) + '...'
                            : item.label;
                    return (
                        <React.Fragment key={index}>
                            <BreadcrumbItem>
                                {item.href ? (
                                    <BreadcrumbLink asChild>
                                        <Link to={item.href}>{displayLabel}</Link>
                                    </BreadcrumbLink>
                                ) : (
                                    <BreadcrumbPage>{displayLabel}</BreadcrumbPage>
                                )}
                            </BreadcrumbItem>
                            {index < items.length - 1 && <BreadcrumbSeparator />}
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default Breadcrumbs;