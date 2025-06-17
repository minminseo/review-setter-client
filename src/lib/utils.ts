import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 複数のTailwind CSSクラスを結合し、競合するスタイルを解決するユーティリティ関数
 * @param inputs - 結合したいクラス名のリスト
 * @returns 解決済みの単一のクラス文字列
 */
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}