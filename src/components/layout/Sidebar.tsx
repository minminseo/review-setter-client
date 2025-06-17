import { NavLink } from 'react-router-dom';
import { HomeIcon, PlusCircleIcon, DocumentPlusIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// 親コンポーネントから受け取るPropsの型を定義
type SidebarProps = {
    onOpenCreateItem: () => void;
    onOpenCreatePattern: () => void;
    onOpenSettings: () => void;
}

/**
 * 画面左端に表示されるサイドバーコンポーネント
 *
 * @param onOpenCreateItem - 復習物作成モーダルを開くためのコールバック関数
 * @param onOpenCreatePattern - パターン作成モーダルを開くためのコールバック関数
 * @param onOpenSettings - 設定モーダルを開くためのコールバック関数
 */
const Sidebar = ({ onOpenCreateItem, onOpenCreatePattern, onOpenSettings }: SidebarProps) => {
    return (
        // position: fixedで画面左に固定表示
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
            <TooltipProvider>
                {/* 上部のナビゲーションアイコン */}
                <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
                    {/* ホームボタン: NavLinkを使い、アクティブな場合にスタイルを変更 */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <NavLink to="/" className={({ isActive }) => `flex h-9 w-9 items-center justify-center rounded-lg transition-colors md:h-8 md:w-8 ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                                <HomeIcon className="h-5 w-5" />
                                <span className="sr-only">Home</span>
                            </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">ホーム</TooltipContent>
                    </Tooltip>

                    {/* 復習物作成ボタン: デザイン案の青いプラスボタンを再現 */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full bg-blue-500 text-white hover:bg-blue-600 h-9 w-9" onClick={onOpenCreateItem}>
                                <PlusCircleIcon className="h-6 w-6" />
                                <span className="sr-only">復習物を追加</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">復習物を追加</TooltipContent>
                    </Tooltip>

                    {/* パターン作成ボタン: デザイン案のグレーのプラスボタンを再現 */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-lg text-muted-foreground" onClick={onOpenCreatePattern}>
                                <DocumentPlusIcon className="h-6 w-6" />
                                <span className="sr-only">復習パターンを作成</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">復習パターンを作成</TooltipContent>
                    </Tooltip>
                </nav>

                {/* 下部の設定アイコン: mt-autoで要素をコンテナ下部に押しやる */}
                <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-lg text-muted-foreground" onClick={onOpenSettings}>
                                <UserCircleIcon className="h-6 w-6" />
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