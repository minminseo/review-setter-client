import api from './index';
import { PatternResponse, CreatePatternRequest, UpdatePatternRequest } from '@/types';

/**
 * ユーザーが作成した全てのパターンを取得する
 * @returns パターンの配列
 */
export const fetchPatterns = async (): Promise<PatternResponse[]> => {
    const response = await api.get<PatternResponse[]>('/patterns');
    return response.data;
};

/**
 * 新しいパターンを作成する
 * @param data - 作成に必要なパターン情報
 * @returns 作成されたパターンオブジェクト
 */
export const createPattern = async (data: CreatePatternRequest): Promise<PatternResponse> => {
    const response = await api.post<PatternResponse>('/patterns', data);
    return response.data;
};

/**
 * 既存のパターンを更新する
 * @param id - 更新対象のパターンID
 * @param data - 更新内容
 * @returns 更新後のパターンオブジェクト
 */
export const updatePattern = async ({ id, data }: { id: string, data: UpdatePatternRequest }): Promise<PatternResponse> => {
    const response = await api.put<PatternResponse>(`/patterns/${id}`, data);
    return response.data;
};

/**
 * 指定したIDのパターンを削除する
 * @param id - 削除対象のパターンID
 */
export const deletePattern = async (id: string): Promise<void> => {
    await api.delete(`/patterns/${id}`);
};