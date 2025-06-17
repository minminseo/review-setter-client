import { create } from 'zustand';
import { ItemResponse, GetDailyReviewDatesResponse } from '@/types';

// データ本体：ボックスIDをキーとして、アイテムの配列を保持する
type ItemStoreData = Record<string, ItemResponse[]>; // Keyed by boxId or a special key for unclassified

interface ItemState {
    itemsByBoxId: ItemStoreData;
    // 「今日の復習」ページの専用データ
    todaysReviews: GetDailyReviewDatesResponse | null;

    // --- セレクター関数 ---
    /**
     * 指定されたボックスIDに対応するアイテムのリストを取得する
     * @param boxId - 取得したいアイテムリストの親ボックスID
     */
    getItemsForBox: (boxId: string) => ItemResponse[] | undefined;

    // --- アクション関数 ---
    /**
     * 特定のボックスのアイテムリストをAPIから取得したデータでセット（または上書き）する
     */
    setItemsForBox: (boxId: string, items: ItemResponse[]) => void;
    /**
     * 「今日の復習」データをセットする
     */
    setTodaysReviews: (data: GetDailyReviewDatesResponse) => void;
    /**
     * 特定のボックスに新しいアイテムを追加する
     */
    addItemToBox: (boxId: string, item: ItemResponse) => void;
    /**
     * 特定のボックスのアイテムを更新する
     */
    updateItemInBox: (boxId: string, updatedItem: ItemResponse) => void;
    /**
     * 特定のボックスからアイテムを削除する
     */
    removeItemFromBox: (boxId: string, itemId: string) => void;
}

export const useItemStore = create<ItemState>((set, get) => ({
    itemsByBoxId: {},
    todaysReviews: null,

    getItemsForBox: (boxId) => get().itemsByBoxId[boxId],

    setItemsForBox: (boxId, items) => set((state) => ({
        itemsByBoxId: { ...state.itemsByBoxId, [boxId]: items },
    })),

    setTodaysReviews: (data) => set({ todaysReviews: data }),

    addItemToBox: (boxId, item) => set((state) => ({
        itemsByBoxId: {
            ...state.itemsByBoxId,
            [boxId]: [...(state.itemsByBoxId[boxId] || []), item],
        },
    })),

    updateItemInBox: (boxId, updatedItem) => set((state) => ({
        itemsByBoxId: {
            ...state.itemsByBoxId,
            [boxId]: (state.itemsByBoxId[boxId] || []).map((item) =>
                item.item_id === updatedItem.item_id ? updatedItem : item
            ),
        },
    })),

    removeItemFromBox: (boxId, itemId) => set((state) => ({
        itemsByBoxId: {
            ...state.itemsByBoxId,
            [boxId]: (state.itemsByBoxId[boxId] || []).filter((item) => item.item_id !== itemId),
        },
    })),
}));