import { Outlet } from 'react-router-dom';
import * as React from 'react';
import { useState, useEffect } from 'react';
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
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(220);
    const [isMobile, setIsMobile] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // 画面サイズの監視
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);

        return () => window.removeEventListener('resize', checkIsMobile);
    }, []);

    const openCreateItemModal = React.useCallback((context: { categoryId?: string; boxId?: string } = {}) => {
        // 文脈が明示的に渡されていない場合は未分類をデフォルトに設定
        // UNCLASSIFIED_IDとして'unclassified'を使用
        const defaultContext = {
            categoryId: context.categoryId || 'unclassified',
            boxId: context.boxId || 'unclassified'
        };
        setModalContext(defaultContext);
        setCreateItemModalOpen(true);
    }, []);

    const updateCreateItemContext = React.useCallback((context: { categoryId?: string; boxId?: string }) => {
        setModalContext(context);
    }, []);

    return (
        <div className="flex h-screen w-full flex-col bg-muted/10 overflow-hidden">
            {/* サイドバーコンポーネントに、モーダルを開くためのコールバック関数をpropsとして渡す */}
            <Sidebar
                onOpenCreateItem={openCreateItemModal}
                onOpenCreatePattern={() => setCreatePatternModalOpen(true)}
                onOpenSettings={() => setSettingsModalOpen(true)}
                open={sidebarOpen}
                setOpen={setSidebarOpen}
                sidebarWidth={sidebarWidth}
                setSidebarWidth={setSidebarWidth}
                onDragStateChange={(dragging) => setIsDragging(dragging)}
            />
            {/* メインコンテンツエリア。サイドバーの幅に応じて左paddingを調整 */}
            <div className={`flex flex-col flex-1 sm:gap-4 sm:py-4 ${!isDragging ? 'transition-all duration-200' : ''} overflow-hidden`} style={{ paddingLeft: !isMobile ? (sidebarOpen ? `${sidebarWidth}px` : '56px') : '0' }}>
                <main className="flex-1 flex flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 overflow-hidden">
                    {/* ここにHomePageやCategoryPageなどの、各ページコンポーネントが描画される */}
                    <ModalProvider
                        openCreateItemModal={openCreateItemModal}
                        updateCreateItemContext={updateCreateItemContext}
                    >
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