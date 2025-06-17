// カテゴリーリソースに関するAPI関数をまとめたファイル。
import api from './index';
import { GetCategoryOutput, CreateCategoryInput, UpdateCategoryInput } from '@/types';

export const fetchCategories = async (): Promise<GetCategoryOutput[]> => {
    const response = await api.get<GetCategoryOutput[]>('/categories');
    return response.data;
};

export const createCategory = async (data: CreateCategoryInput): Promise<GetCategoryOutput> => {
    const response = await api.post<GetCategoryOutput>('/categories', data);
    return response.data;
};

export const updateCategory = async ({ id, data }: { id: string; data: UpdateCategoryInput }): Promise<GetCategoryOutput> => {
    const response = await api.put<GetCategoryOutput>(`/categories/${id}`, data);
    return response.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
};