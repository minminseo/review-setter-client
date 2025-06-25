// 復習物アイテムに関する、最も多機能なAPI関数をまとめたファイル
import api from './index';
import { ItemResponse, CreateItemRequest, UpdateItemRequest, UpdateReviewDatesRequest, UpdateItemAsUnFinishedForceRequest, GetDailyReviewDatesResponse, UpdateReviewDateAsCompletedRequest, UpdateReviewDateAsInCompletedRequest } from '@/types';
import { format } from 'date-fns';

// --- アイテムのCRUD ---
export const createItem = async (data: CreateItemRequest) => {
    console.log('=== createItem API Call Debug ===');
    console.log('Request data:', data);
    
    const response = await api.post<ItemResponse>('/items', data);
    
    console.log('=== createItem API Response Debug ===');
    console.log('Response data:', response.data);
    console.log('review_dates in create response:', response.data.review_dates);
    console.log('review_dates length in create:', response.data.review_dates?.length);
    console.log('=====================================');
    
    return response.data;
}

export const updateItem = async ({ itemId, data }: { itemId: string, data: UpdateItemRequest }) => {
    console.log('=== updateItem API Call Debug ===');
    console.log('ItemId:', itemId);
    console.log('Request data:', data);
    
    const response = await api.put<ItemResponse>(`/items/${itemId}`, data);
    
    console.log('=== updateItem API Response Debug ===');
    console.log('Full response object:', response);
    console.log('Response data:', response.data);
    console.log('Response data type:', typeof response.data);
    console.log('Response data keys:', Object.keys(response.data));
    console.log('review_dates in response:', response.data.review_dates);
    console.log('review_dates type:', typeof response.data.review_dates);
    console.log('review_dates length:', response.data.review_dates?.length);
    console.log('=====================================');
    
    return response.data;
}

export const deleteItem = async (itemId: string): Promise<void> => {
    await api.delete(`/items/${itemId}`);
}

// --- アイテムのリスト取得 ---
export const fetchUnclassifiedItems = async (): Promise<ItemResponse[]> => {
    console.log('=== fetchUnclassifiedItems API Call ===');
    const response = await api.get<ItemResponse[]>('/items/unclassified');
    console.log('[API] fetchUnclassifiedItems URL: /items/unclassified');
    console.log('[API] fetchUnclassifiedItems response count:', response.data?.length || 0);
    console.log('[API] fetchUnclassifiedItems response:', response.data);
    console.log('=====================================');
    return response.data;
}

export const fetchItemsByBox = async (boxId: string): Promise<ItemResponse[]> => {
    console.log('=== fetchItemsByBox API Call ===');
    console.log('[API] fetchItemsByBox boxId:', boxId);
    const response = await api.get<ItemResponse[]>(`/items/${boxId}`);
    console.log('[API] fetchItemsByBox URL:', `/items/${boxId}`);
    console.log('[API] fetchItemsByBox response count:', response.data?.length || 0);
    console.log('[API] fetchItemsByBox response:', response.data);
    console.log('=================================');
    return response.data;
}

export const fetchUnclassifiedItemsByCategory = async (categoryId: string): Promise<ItemResponse[]> => {
    console.log('=== fetchUnclassifiedItemsByCategory API Call ===');
    console.log('[API] fetchUnclassifiedItemsByCategory categoryId:', categoryId);
    const response = await api.get<ItemResponse[]>(`/items/unclassified/${categoryId}`);
    console.log('[API] fetchUnclassifiedItemsByCategory URL:', `/items/unclassified/${categoryId}`);
    console.log('[API] fetchUnclassifiedItemsByCategory response count:', response.data?.length || 0);
    console.log('[API] fetchUnclassifiedItemsByCategory response:', response.data);
    console.log('===============================================');
    return response.data;
}

/**
 * 今日の日付でスケジュールされている全ての復習アイテムを取得する
 */
export const fetchTodaysReviews = async (): Promise<GetDailyReviewDatesResponse> => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const response = await api.get<GetDailyReviewDatesResponse>(`/items/today?today=${today}`);
    return response.data;
}

export const fetchFinishedItemsByBox = async (boxId: string): Promise<ItemResponse[]> => {
    const response = await api.get<ItemResponse[]>(`/items/finished/${boxId}`);
    return response.data;
}

export const fetchFinishedUnclassifiedItems = async (): Promise<ItemResponse[]> => {
    const response = await api.get<ItemResponse[]>('/items/finished/unclassified');
    return response.data;
}

export const fetchFinishedUnclassifiedItemsByCategory = async (categoryId: string): Promise<ItemResponse[]> => {
    const response = await api.get<ItemResponse[]>(`/items/finished/unclassified/${categoryId}`);
    return response.data;
}

export const markItemAsFinished = async (itemId: string) => {
    const response = await api.patch(`/items/${itemId}/finish`);
    return response.data;
}

export const markItemAsUnfinished = async ({ itemId, data }: { itemId: string, data: UpdateItemAsUnFinishedForceRequest }) => {
    const response = await api.patch(`/items/${itemId}/unfinish`, data);
    return response.data;
}

export const updateReviewDate = async ({ itemId, reviewDateId, data }: { itemId: string, reviewDateId: string, data: UpdateReviewDatesRequest }) => {
    const response = await api.put(`/items/${itemId}/review-dates/${reviewDateId}`, data);
    return response.data;
}

export const completeReviewDate = async ({ itemId, reviewDateId, data }: { itemId: string, reviewDateId: string, data: UpdateReviewDateAsCompletedRequest }) => {
    const response = await api.patch(`/items/${itemId}/review-dates/${reviewDateId}/complete`, data);
    return response.data;
};

export const incompleteReviewDate = async ({ itemId, reviewDateId, data }: { itemId: string, reviewDateId: string, data: UpdateReviewDateAsInCompletedRequest }) => {
    const response = await api.patch(`/items/${itemId}/review-dates/${reviewDateId}/incomplete`, data);
    return response.data;
};

// ... summary endpoints
export const fetchItemCountByBox = async () => {
    const response = await api.get(`/summary/items/count/by-box`);
    return response.data;
}

export const fetchUnclassifiedItemCountByCategory = async () => {
    const response = await api.get(`/summary/items/count/unclassified/by-category`);
    return response.data;
}

export const fetchUnclassifiedItemCount = async () => {
    const response = await api.get(`/summary/items/count/unclassified`);
    return response.data;
}

export const fetchDailyReviewCountByBox = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const response = await api.get(`/summary/daily-reviews/count/by-box?today=${today}`);
    return response.data;
}

export const fetchDailyUnclassifiedReviewCountByCategory = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const response = await api.get(`/summary/daily-reviews/count/unclassified/by-category?today=${today}`);
    return response.data;
}

export const fetchDailyUnclassifiedReviewCount = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const response = await api.get(`/summary/daily-reviews/count/unclassified?today=${today}`);
    return response.data;
}
/**
 * ホーム画面で使う、今日の復習の総数を取得する
 */
export const fetchTotalDailyReviewCount = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const response = await api.get(`/summary/daily-reviews/count?today=${today}`);
    return response.data;
}
