import { NavLink, useLocation } from 'react-router-dom';
import { HomeIcon, DocumentPlusIcon, UserCircleIcon, ArrowRightOnRectangleIcon, InboxStackIcon, InboxIcon, SquaresPlusIcon, ChevronLeftIcon, ChevronDoubleLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/useAuth';
import { useCategoryStore, useBoxStore } from '@/store';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import React, { useState, useCallback, useRef, useEffect } from 'react';

// 親コンポーネントから受け取るPropsの型を定義
type SidebarProps = {
    onOpenCreateItem: (context?: { categoryId?: string; boxId?: string }) => void;
    onOpenCreatePattern: () => void;
    onOpenSettings: () => void;
    open: boolean;
    setOpen: React.Dispatch<React.SetStateAction<boolean>>;
    sidebarWidth: number;
    setSidebarWidth: React.Dispatch<React.SetStateAction<number>>;
    onDragStateChange: (isDragging: boolean) => void;
}

/**
 * 画面左端に表示されるサイドバーコンポーネント
 *
 * @param onOpenCreateItem - 復習物作成モーダルを開くためのコールバック関数
 * @param onOpenCreatePattern - パターン作成モーダルを開くためのコールバック関数
 * @param onOpenSettings - 設定モーダルを開くためのコールバック関数
 */
const Sidebar = ({ onOpenCreateItem, onOpenCreatePattern, onOpenSettings, open, setOpen, sidebarWidth, setSidebarWidth, onDragStateChange }: SidebarProps) => {
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
    // ドラッグ状態
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<HTMLDivElement>(null);
    // モバイル状態
    const [isMobile, setIsMobile] = useState(false);

    // 画面サイズの監視
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);

        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

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

    // ドラッグ開始処理
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // モバイル時はドラッグを無効にする
        if (isMobile) return;
        e.preventDefault();
        setIsDragging(true);
        onDragStateChange(true);
    }, [isMobile, onDragStateChange]);

    // ドラッグ中の処理
    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        const newWidth = e.clientX;
        // 最小幅180px、最大幅400pxに制限
        const constrainedWidth = Math.max(180, Math.min(400, newWidth));
        setSidebarWidth(constrainedWidth);
    }, [isDragging]);

    // ドラッグ終了処理
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        onDragStateChange(false);
    }, [onDragStateChange]);

    // マウスイベントのリスナー登録
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background sm:flex ${!isDragging ? 'transition-all duration-200' : ''}`}
            style={{ width: open ? sidebarWidth : 56 }}
            onMouseEnter={() => {
                if (!open && !isSidebarPinned && !isDragging) setOpen(true);
            }}
            onMouseLeave={() => {
                if (open && !isSidebarPinned && !isDragging) setOpen(false);
            }}
        >
            <TooltipProvider>
                {/* 上部固定エリア */}
                <div className="flex-shrink-0 ">
                    {/* 開閉トグルボタン（左側に固定） */}
                    <div className="flex items-center justify-start h-9 mt-2 px-2 ">
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
                                <ChevronLeftIcon className="h-5 w-5" />
                            ) : (
                                <ChevronRightIcon className="h-5 w-5" />
                            )}
                        </Button>
                        {open && (
                            <div className="flex-1 flex justify-end">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-lg ml-1"
                                    onClick={() => {
                                        setOpen(false);
                                        setIsSidebarPinned(true); // このトグルで閉じた場合はピン留めON（ホバーで開かない）
                                    }}
                                    aria-label="サイドバーを閉じる（ホバーで開かない）"
                                    tabIndex={0}
                                    disabled={!open}
                                >
                                    <ChevronDoubleLeftIcon className="h-5 w-5" />
                                </Button>
                            </div>
                        )}
                    </div>
                    {/* 上部のナビゲーションアイコン */}
                    <nav className={`flex flex-col gap-4 px-2 sm:py-5 w-full`} style={{ alignItems: 'center' }}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <NavLink
                                    to="/"
                                    className={({ isActive }) =>
                                        [
                                            "h-9 w-full flex items-center rounded pt-1 pb-1 transition-color hover:bg-accent/50 h-10",
                                            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground h-10"
                                        ].join(" ")
                                    }
                                >
                                    <span className="flex items-center w-full h-10">
                                        <span className="flex justify-center items-center min-w-[32px]">
                                            <HomeIcon className="h-5 w-5" />
                                        </span>
                                        <span
                                            className={`ml-2 text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-muted-foreground ${open ? 'flex-1' : 'max-w-0 opacity-0'} pl-0`}
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
                </div>
                {/* 中央スクロール可能エリア */}
                <div className="flex-1 min-h-0" style={{ width: open ? sidebarWidth : 56 }}>
                    <ScrollArea key={`scroll-area-${open}`} className="h-full w-full">
                        <div className={`flex flex-col gap-2 sidebar-content ${open ? 'sidebar-open' : 'sidebar-closed'}`} style={{ width: open ? sidebarWidth : 56, minWidth: open ? sidebarWidth : 56 }}>
                            {/* Editセクション */}
                            <div
                                className="w-full px-2 transition-all duration-300 overflow-hidden "
                                style={{
                                    maxHeight: open ? '1000px' : 0,
                                    opacity: open ? 1 : 0
                                }}
                            >
                                <button
                                    className="flex items-center w-full rounded hover:bg-accent/50 transition-colors"
                                    style={{ minHeight: 28 }}
                                    onClick={() => setEditOpen((prev) => !prev)}
                                >
                                    {editOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRightIcon className="w-4 h-4 mr-1" />}
                                    <span
                                        className="text-sm font-bold text-muted-foreground ml-1 transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-left"
                                        style={{
                                            flex: open ? 1 : 0,
                                            opacity: open ? 1 : 0,
                                            transition: 'flex 0.25s, opacity 0.2s',
                                            display: 'inline-block',
                                        }}
                                    >
                                        Edit
                                    </span>
                                </button>
                                <div
                                    className="transition-all duration-300 overflow-hidden "
                                    style={{
                                        maxHeight: editOpen ? '1000px' : 0
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
                                                    flex: open ? 1 : 0,
                                                    opacity: open ? 1 : 0,
                                                    transition: 'flex 0.25s, opacity 0.25s',
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
                                                                flex: open ? 1 : 0,
                                                                opacity: open ? 1 : 0,
                                                                transition: 'flex 0.25s, opacity 0.25s',
                                                                display: 'inline-block',
                                                            }}
                                                        >
                                                            {category.name}
                                                        </span>
                                                    </button>
                                                    <div
                                                        className="ml-6 flex flex-col gap-1 transition-all duration-300 overflow-hidden"
                                                        style={{ maxHeight: expandedCategoryIds.includes(category.id) ? (boxCount * 32 + 8) : 0 }}
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
                                                                    flex: open ? 1 : 0,
                                                                    opacity: open ? 1 : 0,
                                                                    transition: 'flex 0.25s, opacity 0.25s',
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
                                                                        flex: open ? 1 : 0,
                                                                        opacity: open ? 1 : 0,
                                                                        transition: 'flex 0.25s, opacity 0.25s',
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
                            {/* Todayセクション */}
                            <div
                                className="w-full px-2 transition-all duration-300 overflow-hidden"
                                style={{
                                    maxHeight: open ? '1000px' : 0,
                                    opacity: open ? 1 : 0
                                }}
                            >
                                <button
                                    className="flex items-center w-full rounded hover:bg-accent/50 transition-colors"
                                    style={{ minHeight: 28 }}
                                    onClick={() => setTodayOpen((prev) => !prev)}
                                >
                                    {todayOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRightIcon className="w-4 h-4 mr-1" />}
                                    <span className="text-sm font-bold text-muted-foreground ml-1 transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                        style={{
                                            flex: open ? 1 : 0,
                                            opacity: open ? 1 : 0,
                                            transition: 'flex 0.25s, opacity 0.2s',
                                            display: 'inline-block',
                                        }}
                                    >
                                        Today
                                    </span>
                                </button>
                                <div
                                    className="transition-all duration-300 overflow-hidden"
                                    style={{
                                        maxHeight: todayOpen ? '1000px' : 0
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
                                            <InboxIcon className="w-4 h-4 mr-1 flex-shrink-0" />
                                            <span
                                                className="truncate text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis"
                                                style={{
                                                    flex: open ? 1 : 0,
                                                    opacity: open ? 1 : 0,
                                                    transition: 'flex 0.25s, opacity 0.25s',
                                                    display: 'inline-block',
                                                }}
                                            >
                                                全て
                                            </span>
                                        </NavLink>
                                        {/* 未分類ボックスの今日の復習 */}
                                        <button
                                            className={`text-sm px-2 rounded transition-colors text-left relative flex items-center ${location.pathname === '/today' && todayCategoryParam === 'unclassified' && todayBoxParam === 'unclassified'
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
                                                    flex: open ? 1 : 0,
                                                    opacity: open ? 1 : 0,
                                                    transition: 'flex 0.25s, opacity 0.25s',
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
                                                        className={`flex items-center w-full gap-1 mb-1 px-2 py-1 rounded transition-colors text-sm justify-start ${location.pathname === '/today' && todayCategoryParam === category.id && (!todayBoxParam || todayBoxParam === 'all')
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
                                                                flex: open ? 1 : 0,
                                                                opacity: open ? 1 : 0,
                                                                transition: 'flex 0.25s, opacity 0.25s',
                                                                display: 'inline-block',
                                                            }}
                                                        >
                                                            {category.name}
                                                        </span>
                                                    </button>
                                                    <div
                                                        className="ml-6 flex flex-col gap-1 transition-all duration-300 overflow-hidden"
                                                        style={{ maxHeight: todayExpandedCategoryIds.includes(category.id) ? (boxCount * 32 + 8) : 0 }}
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
                                                                    flex: open ? 1 : 0,
                                                                    opacity: open ? 1 : 0,
                                                                    transition: 'flex 0.25s, opacity 0.25s',
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
                                                                        flex: open ? 1 : 0,
                                                                        opacity: open ? 1 : 0,
                                                                        transition: 'flex 0.25s, opacity 0.25s',
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
                        </div>
                        {open && <ScrollBar key={`scrollbar-${open}`} orientation="vertical" className="!bg-transparent [&>div]:!bg-gray-600" />}
                    </ScrollArea>
                </div>
                {/* 下部固定エリア */}
                <div className="flex-shrink-0 w-full ">
                    {/* 下部の設定・ログアウト・追加/作成ボタン */}
                    <nav className={`flex flex-col gap-1 px-2 sm:py-2 w-full pl-0 ml-0 `} style={{ alignItems: 'center' }}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={`h-11 w-full flex items-center rounded-lg justify-center `}
                                    onClick={() => {
                                        // Todayセクションが選択されている場合はそちらを優先
                                        if (location.pathname === '/today') {
                                            // カテゴリー選択中かつボックスが「全て」または未指定なら未分類を初期値に
                                            if (todayCategoryParam && (!todayBoxParam || todayBoxParam === 'all')) {
                                                onOpenCreateItem({
                                                    categoryId: todayCategoryParam,
                                                    boxId: 'unclassified'
                                                });
                                            } else {
                                                onOpenCreateItem({
                                                    categoryId: todayCategoryParam || undefined,
                                                    boxId: todayBoxParam || undefined
                                                });
                                            }
                                        } else {
                                            onOpenCreateItem({
                                                categoryId: currentCategoryId || undefined,
                                                boxId: currentBoxId || undefined
                                            });
                                        }
                                    }}
                                >
                                    <span className="flex items-center w-full">
                                        <span className="flex justify-center items-center min-w-[32px]">
                                            <DocumentPlusIcon className="h-6 w-6" />
                                        </span>
                                        <span className={`text-left ml-2 text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-muted-foreground ${open ? 'flex-1 opacity-100' : 'max-w-0 opacity-0'}`}>
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
                                    className={`h-11 w-full flex items-center rounded-lg text-muted-foreground justify-center`}
                                    onClick={onOpenCreatePattern}
                                >
                                    <span className="flex items-center w-full">
                                        <span className="flex justify-center items-center min-w-[32px]">
                                            <SquaresPlusIcon className="h-6 w-6" />
                                        </span>
                                        <span className={`text-left ml-2 text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-muted-foreground ${open ? 'flex-1 opacity-100' : 'max-w-0 opacity-0'}`}>
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
                                    className={`h-11 ml-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 w-full flex items-center justify-center`}
                                    onClick={handleLogout}
                                    disabled={isLoggingOut}
                                >
                                    <span className="flex items-center w-full">
                                        <span className="flex justify-center items-center min-w-[32px]">
                                            <ArrowRightOnRectangleIcon className="h-6 w-6" />
                                        </span>
                                        <span className={`text-left ml-2 text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-muted-foreground ${open ? 'flex-1 opacity-100' : 'max-w-0 opacity-0'}`}>
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
                                    className={`h-11 rounded-lg text-muted-foreground  w-full flex items-center justify-center`}
                                    onClick={onOpenSettings}
                                >
                                    <span className="flex items-center w-full">
                                        <span className="flex justify-center items-center min-w-[32px]">
                                            <UserCircleIcon className="h-6 w-6" />
                                        </span>
                                        <span className={`text-left ml-2 text-sm transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis text-muted-foreground ${open ? 'flex-1 opacity-100' : 'max-w-0 opacity-0'}`}>
                                            設定
                                        </span>
                                    </span>
                                    <span className="sr-only">設定</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">設定</TooltipContent>
                        </Tooltip>
                    </nav>
                </div>
            </TooltipProvider>
            {/* リサイザー（デスクトップのみ） */}
            {open && !isMobile && (
                <div
                    ref={dragRef}
                    className="fixed top-0 bottom-0 z-20 w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors"
                    style={{ left: sidebarWidth - 2 }}
                    onMouseDown={handleMouseDown}
                    onMouseEnter={(e) => {
                        e.stopPropagation();
                    }}
                    onMouseLeave={(e) => {
                        e.stopPropagation();
                    }}
                />
            )}
        </aside>
    );
};

export default Sidebar;