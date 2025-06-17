import { create } from 'zustand';
import { PatternResponse } from '@/types';

// 復習パターンデータをアプリケーション全体で共有するためのストア
interface PatternState {
    patterns: PatternResponse[];
    // APIから取得したパターンリストでストアを初期化/上書きする
    setPatterns: (patterns: PatternResponse[]) => void;
    // 新しいパターンをリストの末尾に追加する（楽観的更新用）
    addPattern: (pattern: PatternResponse) => void;
    // 既存のパターン情報を更新する（楽観的更新用）
    updatePattern: (updatedPattern: PatternResponse) => void;
    // 指定されたIDのパターンをリストから削除する（楽観的更新用）
    removePattern: (patternId: string) => void;
}

export const usePatternStore = create<PatternState>((set) => ({
    patterns: [],
    setPatterns: (patterns) => set({ patterns }),
    addPattern: (pattern) => set((state) => ({ patterns: [...state.patterns, pattern] })),
    updatePattern: (updatedPattern) => set((state) => ({
        patterns: state.patterns.map((p) => p.id === updatedPattern.id ? updatedPattern : p),
    })),
    removePattern: (patternId) => set((state) => ({
        patterns: state.patterns.filter((p) => p.id !== patternId),
    })),
}));