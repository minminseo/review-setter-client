import { create } from 'zustand';
import { GetBoxOutput } from '@/types';

interface BoxState {
    boxesByCategoryId: Record<string, GetBoxOutput[]>; // Keyed by categoryId
    getBoxesForCategory: (categoryId: string) => GetBoxOutput[] | undefined;
    setBoxesForCategory: (categoryId: string, boxes: GetBoxOutput[]) => void;
    addBox: (categoryId: string, box: GetBoxOutput) => void;
    updateBox: (categoryId: string, updatedBox: GetBoxOutput) => void;
    removeBox: (categoryId: string, boxId: string) => void;
}

export const useBoxStore = create<BoxState>((set, get) => ({
    boxesByCategoryId: {},
    getBoxesForCategory: (categoryId) => get().boxesByCategoryId[categoryId],
    setBoxesForCategory: (categoryId, boxes) => set((state) => ({
        boxesByCategoryId: { ...state.boxesByCategoryId, [categoryId]: boxes },
    })),
    addBox: (categoryId, box) => set((state) => ({
        boxesByCategoryId: {
            ...state.boxesByCategoryId,
            [categoryId]: [...(state.boxesByCategoryId[categoryId] || []), box],
        },
    })),
    updateBox: (categoryId, updatedBox) => set((state) => ({
        boxesByCategoryId: {
            ...state.boxesByCategoryId,
            [categoryId]: (state.boxesByCategoryId[categoryId] || []).map((b) =>
                b.id === updatedBox.id ? updatedBox : b
            ),
        },
    })),
    removeBox: (categoryId, boxId) => set((state) => ({
        boxesByCategoryId: {
            ...state.boxesByCategoryId,
            [categoryId]: (state.boxesByCategoryId[categoryId] || []).filter((b) => b.id !== boxId),
        },
    })),
}));

