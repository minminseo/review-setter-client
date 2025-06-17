import { create } from 'zustand';
import { GetCategoryOutput } from '@/types';

// カテゴリーデータを管理するストア
interface CategoryState {
    categories: GetCategoryOutput[];
    setCategories: (categories: GetCategoryOutput[]) => void;
    addCategory: (category: GetCategoryOutput) => void;
    updateCategory: (updatedCategory: GetCategoryOutput) => void;
    removeCategory: (categoryId: string) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
    categories: [],
    setCategories: (categories) => set({ categories }),
    addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
    updateCategory: (updatedCategory) => set((state) => ({
        categories: state.categories.map((c) => c.id === updatedCategory.id ? updatedCategory : c),
    })),
    removeCategory: (categoryId) => set((state) => ({
        categories: state.categories.filter((c) => c.id !== categoryId),
    })),
}));