// 復習物 = item

import { create } from 'zustand';
import { ItemResponse, GetDailyReviewDatesResponse } from '@/types';

// box_idをキーとして、復習物の配列を保持する
type ItemStoreData = Record<string, ItemResponse[]>;

interface ItemState {
    itemsByBoxId: ItemStoreData;
    todaysReviews: GetDailyReviewDatesResponse | null;

    /**
     * 指定されたbox_idに対応する復習物のリストを取得する
     * @param boxId - 取得したい復習物リストの親ボックスID
     */
    getItemsForBox: (boxId: string) => ItemResponse[] | undefined;

    // 特定のボックスの復習物リストをAPIから取得したデータでセット（または上書き）する
    setItemsForBox: (boxId: string, items: ItemResponse[]) => void;

    // 「今日の復習」データをセットする
    setTodaysReviews: (data: GetDailyReviewDatesResponse) => void;

    // 特定のボックスに新しい復習物を追加する
    addItemToBox: (boxId: string, item: ItemResponse) => void;

    // 特定のボックスの復習物を更新する
    updateItemInBox: (boxId: string, updatedItem: ItemResponse) => void;

    // 特定のボックスから復習物を削除する
    removeItemFromBox: (boxId: string, itemId: string) => void;
}

export const useItemStore = create<ItemState>((set, get) => ({
    itemsByBoxId: {},
    todaysReviews: null,

    getItemsForBox: (boxId) => {
        const result = get().itemsByBoxId[boxId];
        return result;
    },

    setItemsForBox: (boxId, items) => {
        set((state) => ({
            itemsByBoxId: {
                ...state.itemsByBoxId,
                [boxId]: items // 重複フィルタリングを削除
            },
        }));
    },

    setTodaysReviews: (data) => set({ todaysReviews: data }),

    addItemToBox: (boxId, item) => set((state) => {
        // 完了済み復習物は追加しない（ただし、サーバーからの正確なデータは信頼）
        if (item.is_finished) return state;

        // 重複チェック：同じ復習物IDが既に存在する場合は追加しない
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

        // 完了済み復習物に更新された場合は削除
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