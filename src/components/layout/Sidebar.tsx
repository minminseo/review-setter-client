import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, PlusCircleIcon, DocumentPlusIcon, UserCircleIcon, ArrowRightOnRectangleIcon, InboxStackIcon, InboxIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCategoryStore, useBoxStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import React, { useState } from 'react';

// 親コンポーネントから受け取るPropsの型を定義
type SidebarProps = {
    onOpenCreateItem: (context?: { categoryId?: string; boxId?: string }) => void;
    onOpenCreatePattern: () => void;
    onOpenSettings: () => void;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * 画面左端に表示されるサイドバーコンポーネント
 *
 * @param onOpenCreateItem - 復習物作成モーダルを開くためのコールバック関数
 * @param onOpenCreatePattern - パターン作成モーダルを開くためのコールバック関数
 * @param onOpenSettings - 設定モーダルを開くためのコールバック関数
 */
const Sidebar = ({ onOpenCreateItem, onOpenCreatePattern, onOpenSettings, open, setOpen }: SidebarProps) => {
    const { logout, isLoggingOut } = useAuth();
    const { categories } = useCategoryStore();
    const { boxesByCategoryId } = useBoxStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
    // サイドバーのピン留め状態
    const [isSidebarPinned, setIsSidebarPinned] = useState(false);
    // Editセクションのトグル状態
    const [editOpen, setEditOpen] = useState(true);
    // Todayセクションのトグル状態
    const [todayOpen, setTodayOpen] = useState(true);
    // Todayセクション用の展開カテゴリー
    const [todayExpandedCategoryIds, setTodayExpandedCategoryIds] = useState<string[]>([]);
    // カテゴリーボタンのホバー状態
    const [hoveredCategoryId, setHoveredCategoryId] = useState<string | null>(null);
    // Todayセクション用のカテゴリーホバー状態
    const [todayHoveredCategoryId, setTodayHoveredCategoryId] = useState<string | null>(null);

    // 現在のcategoryId, boxIdをパスから抽出（正規表現を使わず分割で）
    const pathParts = location.pathname.split('/');
    let currentCategoryId: string | null = null;
    let currentBoxId: string | null = null;
    
    // URLパラメータから今日の復習ページの選択状態を取得
    const urlParams = new URLSearchParams(location.search);
    const todayCategoryParam = urlParams.get('category');
    const todayBoxParam = urlParams.get('box');
    
    // 通常のカテゴリー・ボックスページの場合
    const catIdx = pathParts.indexOf('categories');
    if (catIdx !== -1 && pathParts.length > catIdx + 1) {
        currentCategoryId = pathParts[catIdx + 1];
        if (pathParts[catIdx + 2] === 'boxes' && pathParts.length > catIdx + 3) {
            currentBoxId = pathParts[catIdx + 3];
        }
    }
    

    const handleLogout = () => {
        logout();
    };

    const handleCategoryClick = (categoryId: string) => {
        navigate(`/categories/${categoryId}`);
    };
    const handleBoxClick = (categoryId: string, boxId: string) => {
        navigate(`/categories/${categoryId}/boxes/${boxId}`);
    };

    const handleTodayCategoryClick = (categoryId: string) => {
        navigate(`/today?category=${categoryId}`);
    };

    const handleTodayBoxClick = (categoryId: string, boxId: string) => {
        navigate(`/today?category=${categoryId}&box=${boxId}`);
    };

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background sm:flex transition-all duration-200 ${open ? 'w-48' : 'w-14'}`}
            onMouseEnter={() => {
                if (!open && !isSidebarPinned) setOpen(true);
            }}
            onMouseLeave={() => {
                if (open && !isSidebarPinned) setOpen(false);
            }}
        >
            <TooltipProvider>
                {/* 開閉トグルボタン（左側に固定） */}
                <div className="flex items-center justify-start h-12 px-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg"
                        onClick={() => {
                            if (open) {
                                // 開いてる状態でクリック→閉じる＆ピン留め解除
                                setOpen(false);
                                setIsSidebarPinned(false);
                            } else {
                                // 閉じてる状態でクリック→開く＆ピン留めON
                                setOpen(true);
                                setIsSidebarPinned(true);
                            }
                        }}
                        aria-label={open ? 'サイドバーを閉じる' : 'サイドバーを開く'}
                        tabIndex={0}
                    >
                        {open ? (
                            <ChevronLeft className="h-5 w-5" />
                        ) : (
                            <ChevronRight className="h-5 w-5" />
                        )}
                    </Button>
                </div>
                {/* 上部のナビゲーションアイコン */}
                <nav className={`flex flex-col gap-4 px-2 sm:py-5 w-full`} style={{ alignItems: 'center' }}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <NavLink
                                to="/"
                                className={({ isActive }) =>
                                    [
                                        "h-9 w-full flex items-center rounded-lg transition-colors",
                                        isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                                    ].join(" ")
                                }
                            >
                                <span className="flex items-center w-full">
                                    <span className="flex justify-center items-center min-w-[32px]">
                                        <HomeIcon className="h-5 w-5" />
                                    </span>
                                    <span
                                        className={`ml-2 text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-muted-foreground ${open ? 'max-w-[144px]' : 'max-w-0 opacity-0'} pl-0`}
                                        style={{ height: '20px', display: 'flex', alignItems: 'center' }}
                                    >
                                        ホーム
                                    </span>
                                </span>
                            </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">ホーム</TooltipContent>
                    </Tooltip>
                </nav>
                {/* Editセクション: サイドバーが開いているときのみ表示 */}
                {open && (
                    <div className="w-full px-2">
                        <button
                            className="flex items-center w-full rounded hover:bg-accent/50 transition-colors"
                            style={{ minHeight: 28 }}
                            onClick={() => setEditOpen((prev) => !prev)}
                        >
                            {editOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRightIcon className="w-4 h-4 mr-1" />}
                            <span className="text-sm font-bold text-muted-foreground ml-1 transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                style={{
                                    maxWidth: open ? 120 : 0,
                                    opacity: open ? 1 : 0,
                                    transition: 'max-width 0.25s, opacity 0.2s',
                                    display: 'inline-block',
                                }}
                            >
                                Edit
                            </span>
                        </button>
                        <div
                            className="transition-all duration-300 overflow-hidden"
                            style={{
                                maxHeight: open && editOpen ? 600 : 0 // 600pxで十分な高さ（多くのカテゴリでも）
                            }}
                        >
                            <div className="flex flex-col gap-1 pl-2">
                                {/* 未分類ボックス */}
                                <button
                                    className={`text-sm px-2 mt-1 rounded transition-colors text-left relative flex items-center ${currentCategoryId === 'unclassified' && currentBoxId === 'unclassified'
                                        ? 'text-accent-foreground bg-accent'
                                        : 'text-muted-foreground hover:bg-accent/50'
                                        }`}
                                    onClick={() => handleBoxClick('unclassified', 'unclassified')}
                                    style={{ minHeight: 28, position: 'relative' }}
                                >
                                    <InboxIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                    <span
                                        className="truncate text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                        style={{
                                            maxWidth: open ? 144 : 0,
                                            opacity: open ? 1 : 0,
                                            transition: 'max-width 0.25s, opacity 0.25s',
                                            display: 'inline-block',
                                        }}
                                    >
                                        未分類-未分類
                                    </span>
                                </button>
                                {categories.map(category => {
                                    const boxCount = (boxesByCategoryId[category.id]?.length || 0) + 1; // +1 for '未分類'
                                    return (
                                        <div key={category.id}>
                                            {/* カテゴリボタン */}
                                            <button
                                                className={`flex items-center w-full gap-1 mb-1 px-2 py-1 rounded transition-colors text-sm justify-start ${((currentCategoryId === category.id) && (!currentBoxId || currentBoxId === undefined))
                                                    ? 'text-accent-foreground bg-accent'
                                                    : 'text-muted-foreground hover:bg-accent/50'
                                                    }`}
                                                style={{ minHeight: 28, position: 'relative' }}
                                                onMouseEnter={() => setHoveredCategoryId(category.id)}
                                                onMouseLeave={() => setHoveredCategoryId(null)}
                                            >
                                                <span
                                                    className="flex items-center"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        setExpandedCategoryIds(prev =>
                                                            prev.includes(category.id)
                                                                ? prev.filter(id => id !== category.id)
                                                                : [...prev, category.id]
                                                        );
                                                    }}
                                                    style={{ minWidth: 24 }}
                                                >
                                                    {hoveredCategoryId === category.id ? (
                                                        expandedCategoryIds.includes(category.id) ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRightIcon className="w-4 h-4 mr-1" />
                                                    ) : (
                                                        <InboxStackIcon className="w-4 h-4 mr-1" />
                                                    )}
                                                </span>
                                                <span
                                                    className="flex-1 truncate cursor-pointer text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-left"
                                                    onClick={() => handleCategoryClick(category.id)}
                                                    style={{
                                                        maxWidth: open ? 144 : 0,
                                                        opacity: open ? 1 : 0,
                                                        transition: 'max-width 0.25s, opacity 0.25s',
                                                        display: 'inline-block',
                                                    }}
                                                >
                                                    {category.name}
                                                </span>
                                            </button>
                                            <div
                                                className="ml-6 flex flex-col gap-1 transition-all duration-300 overflow-hidden"
                                                style={{ maxHeight: expandedCategoryIds.includes(category.id) ? (boxCount * 28 + 16) : 0 }}
                                            >
                                                {/* 未分類ボックス */}
                                                <button
                                                    className={`text-sm px-2 py-1 rounded transition-colors text-left relative flex items-center justify-start ${currentCategoryId === category.id && currentBoxId === 'unclassified'
                                                        ? 'text-accent-foreground bg-accent'
                                                        : 'text-muted-foreground hover:bg-accent/50'
                                                        }`}
                                                    onClick={() => handleBoxClick(category.id, 'unclassified')}
                                                    style={{ minHeight: 28 }}
                                                >
                                                    <InboxIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                                    <span
                                                        className="truncate text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                                        style={{
                                                            maxWidth: open ? 144 : 0,
                                                            opacity: open ? 1 : 0,
                                                            transition: 'max-width 0.25s, opacity 0.25s',
                                                            display: 'inline-block',
                                                        }}
                                                    >
                                                        未分類
                                                    </span>
                                                </button>
                                                {/* 通常ボックス */}
                                                {(boxesByCategoryId[category.id] || []).map(box => (
                                                    <button
                                                        key={box.id}
                                                        className={`text-sm px-2 py-1 rounded transition-colors text-left relative flex items-center justify-start ${currentCategoryId === category.id && currentBoxId === box.id
                                                            ? 'text-accent-foreground bg-accent'
                                                            : 'text-muted-foreground hover:bg-accent/50'
                                                            }`}
                                                        onClick={() => handleBoxClick(category.id, box.id)}
                                                        style={{ minHeight: 28 }}
                                                    >
                                                        <InboxIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                                        <span
                                                            className="truncate text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                                            style={{
                                                                maxWidth: open ? 144 : 0,
                                                                opacity: open ? 1 : 0,
                                                                transition: 'max-width 0.25s, opacity 0.25s',
                                                                display: 'inline-block',
                                                            }}
                                                        >
                                                            {box.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
                {/* Todayセクション: サイドバーが開いているときのみ表示 */}
                {open && (
                    <div className="w-full px-2">
                        <button
                            className="flex items-center w-full rounded hover:bg-accent/50 transition-colors"
                            style={{ minHeight: 28 }}
                            onClick={() => setTodayOpen((prev) => !prev)}
                        >
                            {todayOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRightIcon className="w-4 h-4 mr-1" />}
                            <span className="text-sm font-bold text-muted-foreground ml-1 transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                style={{
                                    maxWidth: open ? 120 : 0,
                                    opacity: open ? 1 : 0,
                                    transition: 'max-width 0.25s, opacity 0.2s',
                                    display: 'inline-block',
                                }}
                            >
                                Today
                            </span>
                        </button>
                        <div
                            className="transition-all duration-300 overflow-hidden"
                            style={{
                                maxHeight: open && todayOpen ? 600 : 0
                            }}
                        >
                            <div className="flex flex-col gap-1 pl-2">
                                {/* 全体の今日の復習 */}
                                <NavLink
                                    to="/today"
                                    className={({ isActive }) =>
                                        [
                                            "flex items-center text-sm px-2 mt-1 rounded transition-colors text-left relative",
                                            isActive && !todayCategoryParam && !todayBoxParam ? "text-accent-foreground bg-accent" : "text-muted-foreground hover:bg-accent/50"
                                        ].join(" ")
                                    }
                                    style={{ minHeight: 28 }}
                                >
                                    <CalendarIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                    <span
                                        className="truncate text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                        style={{
                                            maxWidth: open ? 144 : 0,
                                            opacity: open ? 1 : 0,
                                            transition: 'max-width 0.25s, opacity 0.25s',
                                            display: 'inline-block',
                                        }}
                                    >
                                        全て
                                    </span>
                                </NavLink>
                                {/* 未分類ボックスの今日の復習 */}
                                <button
                                    className={`text-sm px-2 mt-1 rounded transition-colors text-left relative flex items-center ${location.pathname === '/today' && todayCategoryParam === 'unclassified' && todayBoxParam === 'unclassified'
                                        ? 'text-accent-foreground bg-accent'
                                        : 'text-muted-foreground hover:bg-accent/50'
                                        }`}
                                    onClick={() => handleTodayBoxClick('unclassified', 'unclassified')}
                                    style={{ minHeight: 28, position: 'relative' }}
                                >
                                    <InboxIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                    <span
                                        className="truncate text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                        style={{
                                            maxWidth: open ? 144 : 0,
                                            opacity: open ? 1 : 0,
                                            transition: 'max-width 0.25s, opacity 0.25s',
                                            display: 'inline-block',
                                        }}
                                    >
                                        未分類-未分類
                                    </span>
                                </button>
                                {categories.map(category => {
                                    const boxCount = (boxesByCategoryId[category.id]?.length || 0) + 1; // +1 for '未分類'
                                    return (
                                        <div key={category.id}>
                                            {/* カテゴリボタン */}
                                            <button
                                                className={`flex items-center w-full gap-1 mb-1 px-2 py-1 rounded transition-colors text-sm justify-start ${location.pathname === '/today' && todayCategoryParam === category.id && !todayBoxParam
                                                    ? 'text-accent-foreground bg-accent'
                                                    : 'text-muted-foreground hover:bg-accent/50'
                                                    }`}
                                                style={{ minHeight: 28, position: 'relative' }}
                                                onMouseEnter={() => setTodayHoveredCategoryId(category.id)}
                                                onMouseLeave={() => setTodayHoveredCategoryId(null)}
                                            >
                                                <span
                                                    className="flex items-center"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        setTodayExpandedCategoryIds(prev =>
                                                            prev.includes(category.id)
                                                                ? prev.filter(id => id !== category.id)
                                                                : [...prev, category.id]
                                                        );
                                                    }}
                                                    style={{ minWidth: 24 }}
                                                >
                                                    {todayHoveredCategoryId === category.id ? (
                                                        todayExpandedCategoryIds.includes(category.id) ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRightIcon className="w-4 h-4 mr-1" />
                                                    ) : (
                                                        <InboxStackIcon className="w-4 h-4 mr-1" />
                                                    )}
                                                </span>
                                                <span
                                                    className="flex-1 truncate cursor-pointer text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-left"
                                                    onClick={() => handleTodayCategoryClick(category.id)}
                                                    style={{
                                                        maxWidth: open ? 144 : 0,
                                                        opacity: open ? 1 : 0,
                                                        transition: 'max-width 0.25s, opacity 0.25s',
                                                        display: 'inline-block',
                                                    }}
                                                >
                                                    {category.name}
                                                </span>
                                            </button>
                                            <div
                                                className="ml-6 flex flex-col gap-1 transition-all duration-300 overflow-hidden"
                                                style={{ maxHeight: todayExpandedCategoryIds.includes(category.id) ? (boxCount * 28 + 16) : 0 }}
                                            >
                                                {/* 未分類ボックス */}
                                                <button
                                                    className={`text-sm px-2 py-1 rounded transition-colors text-left relative flex items-center justify-start ${location.pathname === '/today' && todayCategoryParam === category.id && todayBoxParam === 'unclassified'
                                                        ? 'text-accent-foreground bg-accent'
                                                        : 'text-muted-foreground hover:bg-accent/50'
                                                        }`}
                                                    onClick={() => handleTodayBoxClick(category.id, 'unclassified')}
                                                    style={{ minHeight: 28 }}
                                                >
                                                    <InboxIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                                    <span
                                                        className="truncate text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                                        style={{
                                                            maxWidth: open ? 144 : 0,
                                                            opacity: open ? 1 : 0,
                                                            transition: 'max-width 0.25s, opacity 0.25s',
                                                            display: 'inline-block',
                                                        }}
                                                    >
                                                        未分類
                                                    </span>
                                                </button>
                                                {/* 通常ボックス */}
                                                {(boxesByCategoryId[category.id] || []).map(box => (
                                                    <button
                                                        key={box.id}
                                                        className={`text-sm px-2 py-1 rounded transition-colors text-left relative flex items-center justify-start ${location.pathname === '/today' && todayCategoryParam === category.id && todayBoxParam === box.id
                                                            ? 'text-accent-foreground bg-accent'
                                                            : 'text-muted-foreground hover:bg-accent/50'
                                                            }`}
                                                        onClick={() => handleTodayBoxClick(category.id, box.id)}
                                                        style={{ minHeight: 28 }}
                                                    >
                                                        <InboxIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                                        <span
                                                            className="truncate text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                                            style={{
                                                                maxWidth: open ? 144 : 0,
                                                                opacity: open ? 1 : 0,
                                                                transition: 'max-width 0.25s, opacity 0.25s',
                                                                display: 'inline-block',
                                                            }}
                                                        >
                                                            {box.name}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
                {/* 下部の設定・ログアウト・追加/作成ボタン: mt-autoで要素をコンテナ下部に押しやる */}
                <nav className={`mt-auto flex flex-col gap-4 px-2 sm:py-5 w-full`} style={{ alignItems: 'center' }}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-9 w-full flex items-center rounded-lg justify-center`}
                                onClick={() => onOpenCreateItem()}
                            >
                                <span className="flex items-center w-full">
                                    <span className="flex justify-center items-center min-w-[32px]">
                                        <PlusCircleIcon className="h-6 w-6" />
                                    </span>
                                    <span className={`ml-2 text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-muted-foreground ${open ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                        復習物追加
                                    </span>
                                </span>
                                <span className="sr-only">復習物を追加</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">復習物を追加</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-9 w-full flex items-center rounded-lg text-muted-foreground justify-center`}
                                onClick={onOpenCreatePattern}
                            >
                                <span className="flex items-center w-full">
                                    <span className="flex justify-center items-center min-w-[32px]">
                                        <DocumentPlusIcon className="h-6 w-6" />
                                    </span>
                                    <span className={`ml-2 text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-muted-foreground ${open ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                        パターン作成
                                    </span>
                                </span>
                                <span className="sr-only">復習パターンを作成</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">復習パターンを作成</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 h-9 w-full flex items-center justify-center`}
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                            >
                                <span className="flex items-center w-full">
                                    <span className="flex justify-center items-center min-w-[32px]">
                                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                                    </span>
                                    <span className={`ml-2 text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-muted-foreground ${open ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                        ログアウト
                                    </span>
                                </span>
                                <span className="sr-only">ログアウト</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">ログアウト</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`rounded-lg text-muted-foreground h-9 w-full flex items-center justify-center`}
                                onClick={onOpenSettings}
                            >
                                <span className="flex items-center w-full">
                                    <span className="flex justify-center items-center min-w-[32px]">
                                        <UserCircleIcon className="h-6 w-6" />
                                    </span>
                                    <span className={`ml-2 text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-muted-foreground ${open ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                        設定
                                    </span>
                                </span>
                                <span className="sr-only">設定</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">設定</TooltipContent>
                    </Tooltip>
                </nav>
            </TooltipProvider>
        </aside>
    );
};

export default Sidebar;