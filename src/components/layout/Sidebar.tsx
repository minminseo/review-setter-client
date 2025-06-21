import { NavLink } from 'react-router-dom';
import { HomeIcon, PlusCircleIcon, DocumentPlusIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

    const handleLogout = () => {
        logout();
    };

    return (
        <aside className={`fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background sm:flex transition-all duration-200 ${open ? 'w-48' : 'w-14'}`}>
            <TooltipProvider>
                {/* 開閉トグルボタン（左側に固定） */}
                <div className="flex items-center justify-start h-12 px-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-lg"
                        onClick={() => setOpen((prev) => !prev)}
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
                                        className={`ml-2 text-xs transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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
                                    <span className={`ml-2 text-xs transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>復習物追加</span>
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
                                    <span className={`ml-2 text-xs transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>パターン作成</span>
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
                                    <span className={`ml-2 text-xs transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>ログアウト</span>
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
                                    <span className={`ml-2 text-xs transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>設定</span>
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