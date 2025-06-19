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
        itemsByBoxId: { 
            ...state.itemsByBoxId, 
            [boxId]: items.filter(item => !item.is_finished) // 完了済みアイテムを除外
        },
    })),

    setTodaysReviews: (data) => set({ todaysReviews: data }),

    addItemToBox: (boxId, item) => set((state) => {
        // 完了済みアイテムは追加しない（ただし、サーバーからの正確なデータは信頼）
        if (item.is_finished) return state;
        
        // 重複チェック：同じアイテムIDが既に存在する場合は追加しない
        const existingItems = state.itemsByBoxId[boxId] || [];
        const itemExists = existingItems.some(existingItem => existingItem.item_id === item.item_id);
        if (itemExists) return state;
        
        return {
            itemsByBoxId: {
                ...state.itemsByBoxId,
                [boxId]: [...existingItems, item],
            },
        };
    }),

    updateItemInBox: (boxId, updatedItem) => set((state) => {
        // 完了済みアイテムに更新された場合は削除
        if (updatedItem.is_finished) {
            return {
                itemsByBoxId: {
                    ...state.itemsByBoxId,
                    [boxId]: (state.itemsByBoxId[boxId] || []).filter((item) => 
                        item.item_id !== updatedItem.item_id
                    ),
                },
            };
        }
        
        // 通常の更新
        return {
            itemsByBoxId: {
                ...state.itemsByBoxId,
                [boxId]: (state.itemsByBoxId[boxId] || []).map((item) =>
                    item.item_id === updatedItem.item_id ? updatedItem : item
                ),
            },
        };
    }),

    removeItemFromBox: (boxId, itemId) => set((state) => ({
        itemsByBoxId: {
            ...state.itemsByBoxId,
            [boxId]: (state.itemsByBoxId[boxId] || []).filter((item) => item.item_id !== itemId),
        },
    })),
}));