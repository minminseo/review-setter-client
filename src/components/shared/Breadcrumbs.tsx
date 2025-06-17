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
                {items.map((item, index) => (
                    // ReactのFragmentを使い、余分なDOM要素を生成せずに要素をグループ化
                    <React.Fragment key={index}>
                        <BreadcrumbItem>
                            {item.href ? (
                                // リンクがある場合は、react-router-domのLinkコンポーネントで画面遷移
                                <BreadcrumbLink asChild>
                                    <Link to={item.href}>{item.label}</Link>
                                </BreadcrumbLink>
                            ) : (
                                // リンクがない場合は、現在のページとしてテキスト表示
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            )}
                        </BreadcrumbItem>
                        {/* 最後の項目でなければ、区切り文字（>）を表示 */}
                        {index < items.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
};

export default Breadcrumbs;