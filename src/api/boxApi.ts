import api from './index';
import { GetBoxOutput, CreateBoxInput, UpdateBoxInput } from '@/types';

/**
 * 特定のカテゴリーに属する全てのボックス（復習物ボックス）を取得する
 * @param categoryId - ボックスを取得したいカテゴリーのID
 * @returns ボックスの配列
 */
export const fetchBoxes = async (categoryId: string): Promise<GetBoxOutput[]> => {
    const response = await api.get<GetBoxOutput[]>(`/${categoryId}/boxes`);
    return response.data;
};

/**
 * 特定のカテゴリー内に新しいボックスを作成する
 * @param categoryId - 作成先のカテゴリーID
 * @param data - 作成に必要なボックス情報
 * @returns 作成されたボックスオブジェクト
 */
export const createBox = async ({ categoryId, data }: { categoryId: string; data: CreateBoxInput }): Promise<GetBoxOutput> => {
    const response = await api.post<GetBoxOutput>(`/${categoryId}/boxes`, data);
    return response.data;
};

/**
 * 既存のボックスを更新する
 * @param categoryId - 更新対象ボックスが属するカテゴリーのID
 * @param boxId - 更新対象のボックスID
 * @param data - 更新内容
 * @returns 更新後のボックスオブジェクト
 */
export const updateBox = async ({ categoryId, boxId, data }: { categoryId: string; boxId: string; data: UpdateBoxInput }): Promise<GetBoxOutput> => {
    const response = await api.put<GetBoxOutput>(`/${categoryId}/boxes/${boxId}`, data);
    return response.data;
};

/**
 * 指定したIDのボックスを削除する
 * @param categoryId - 削除対象ボックスが属するカテゴリーのID
 * @param boxId - 削除対象のボックスID
 */
export const deleteBox = async ({ categoryId, boxId }: { categoryId: string; boxId: string }): Promise<void> => {
    await api.delete(`/${categoryId}/boxes/${boxId}`);
};