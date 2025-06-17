import { Outlet } from 'react-router-dom';
import * as React from 'react';
import Sidebar from './Sidebar';

// AppLayoutは、サイドバーから開かれるモーダルの状態を一元管理するため、
// 対応するモーダルコンポーネントを全てインポートする。
import { CreateItemModal } from '../modals/CreateItemModal';
import { CreatePatternModal } from '../modals/CreatePatternModal';
import { SettingsModal } from '../modals/SettingsModal';
import { ModalProvider } from '@/contexts/ModalContext';

/**
 * メインアプリケーション（ログイン後）の共通レイアウト。
 * サイドバーとメインコンテンツエリアで構成される。
 * サイドバーから開かれるグローバルなモーダルの開閉状態も、このコンポーネントが責務を持つ。
 */
const AppLayout = () => {
    // サイドバーから開く各モーダルの開閉状態を管理するstate
    const [isCreateItemModalOpen, setCreateItemModalOpen] = React.useState(false);
    const [modalContext, setModalContext] = React.useState<{ categoryId?: string; boxId?: string }>({});
    const [isCreatePatternModalOpen, setCreatePatternModalOpen] = React.useState(false);
    const [isSettingsModalOpen, setSettingsModalOpen] = React.useState(false);

    const openCreateItemModal = React.useCallback((context: { categoryId?: string; boxId?: string } = {}) => {
        setModalContext(context);
        setCreateItemModalOpen(true);
    }, []);

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/10">
            {/* サイドバーコンポーネントに、モーダルを開くためのコールバック関数をpropsとして渡す */}
            <Sidebar
                onOpenCreateItem={openCreateItemModal}
                onOpenCreatePattern={() => setCreatePatternModalOpen(true)}
                onOpenSettings={() => setSettingsModalOpen(true)}
            />
            {/* メインコンテンツエリア。sm:pl-14でサイドバーの幅分だけ左に余白を作る */}
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                    {/* ここにHomePageやCategoryPageなどの、各ページコンポーネントが描画される */}
                    <ModalProvider openCreateItemModal={openCreateItemModal}>
                        <Outlet />
                    </ModalProvider>
                </main>
            </div>

            {/* --- モーダルコンポーネント群 --- */}
            {/* is~ModalOpen の状態に応じて、各モーダルの表示・非表示が切り替わる */}

            <CreateItemModal
                isOpen={isCreateItemModalOpen}
                onClose={() => {
                    setCreateItemModalOpen(false);
                    setModalContext({});
                }}
                defaultCategoryId={modalContext.categoryId}
                defaultBoxId={modalContext.boxId}
            />

            <CreatePatternModal
                isOpen={isCreatePatternModalOpen}
                onClose={() => setCreatePatternModalOpen(false)}
            />

            <SettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setSettingsModalOpen(false)}
            />
        </div>
    );
};

export default AppLayout;