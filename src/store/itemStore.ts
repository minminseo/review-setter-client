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

    getItemsForBox: (boxId) => {
        const result = get().itemsByBoxId[boxId];
        console.log('=== getItemsForBox Debug ===');
        console.log('[itemStore] boxId:', boxId);
        console.log('[itemStore] result exists:', !!result);
        console.log('[itemStore] result length:', result?.length || 0);
        console.log('[itemStore] all stored keys:', Object.keys(get().itemsByBoxId));
        console.log('[itemStore] all stored data:', get().itemsByBoxId);
        console.log('============================');
        return result;
    },

    setItemsForBox: (boxId, items) => {
        console.log('=== setItemsForBox Debug ===');
        console.log('boxId:', boxId);
        console.log('input items count:', items.length);
        items.forEach((item, index) => {
            console.log(`Item ${index + 1} (${item.name}):`);
            console.log('  - review_dates:', item.review_dates);
            console.log('  - review_dates length:', item.review_dates?.length || 0);
            console.log('  - is_finished:', item.is_finished);
        });
        console.log('============================');

        set((state) => ({
            itemsByBoxId: {
                ...state.itemsByBoxId,
                [boxId]: items // 重複フィルタリングを削除
            },
        }));
    },

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
        console.log('=== Zustand updateItemInBox Method Debug ===');
        console.log('boxId:', boxId);
        console.log('updatedItem.item_id:', updatedItem.item_id);
        console.log('updatedItem.review_dates:', updatedItem.review_dates);
        console.log('updatedItem.review_dates length:', updatedItem.review_dates?.length);
        console.log('is_finished:', updatedItem.is_finished);

        const existingItems = state.itemsByBoxId[boxId] || [];
        const existingItem = existingItems.find(item => item.item_id === updatedItem.item_id);
        console.log('existing item review_dates:', existingItem?.review_dates);
        console.log('============================================');

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
        const newState = {
            itemsByBoxId: {
                ...state.itemsByBoxId,
                [boxId]: (state.itemsByBoxId[boxId] || []).map((item) => {
                    if (item.item_id === updatedItem.item_id) {
                        console.log('=== Replacing item in Zustand ===');
                        console.log('old item review_dates:', item.review_dates);
                        console.log('new item review_dates:', updatedItem.review_dates);
                        console.log('==============================');
                        return updatedItem;
                    }
                    return item;
                })
            },
        };

        return newState;
    }),

    removeItemFromBox: (boxId, itemId) => set((state) => ({
        itemsByBoxId: {
            ...state.itemsByBoxId,
            [boxId]: (state.itemsByBoxId[boxId] || []).filter((item) => item.item_id !== itemId),
        },
    })),
}));