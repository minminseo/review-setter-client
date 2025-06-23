import * as React from 'react';

type ModalContext = {
    openCreateItemModal: (context?: { categoryId?: string; boxId?: string }) => void;
    updateCreateItemContext: (context: { categoryId?: string; boxId?: string }) => void;
};

const ModalContext = React.createContext<ModalContext | null>(null);

export const useModal = () => {
    const context = React.useContext(ModalContext);
    if (!context) {
        throw new Error('useModal must be used within ModalProvider');
    }
    return context;
};

type ModalProviderProps = {
    children: React.ReactNode;
    openCreateItemModal: (context?: { categoryId?: string; boxId?: string }) => void;
    updateCreateItemContext: (context: { categoryId?: string; boxId?: string }) => void;
};

export const ModalProvider = ({ children, openCreateItemModal, updateCreateItemContext }: ModalProviderProps) => {
    return (
        <ModalContext.Provider value={{ openCreateItemModal, updateCreateItemContext }}>
            {children}
        </ModalContext.Provider>
    );
};