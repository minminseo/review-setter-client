import { createContext, useContext, useEffect, useState } from "react"
import { useUserStore } from "@/store/userStore"
import { ThemeColor } from "@/types"

// テーマ（dark/light）の状態とそれを変更する関数を保持するための型
type ThemeProviderState = {
    theme: string
    setTheme: (theme: string) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

/**
 * アプリケーション全体にテーマ機能を提供するコンポーネント
 * @param children - このプロバイダーでラップされる子コンポーネント
 * @param defaultTheme - デフォルトのテーマ（"dark", "light", "system"）
 * @param storageKey - テーマ設定を保存するlocalStorageのキー
 */
export const ThemeProvider = ({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
    ...props
}: {
    children: React.ReactNode
    defaultTheme?: string
    storageKey?: string
}) => {
    // Zustandからテーマ状態を取得
    const zustandTheme = useUserStore((state) => state.theme)

    const [theme, setTheme] = useState(() => {
        // 初期化時はZustandの値を優先
        if (zustandTheme) return zustandTheme;

        // ZustandのlocalStorageからテーマを読み込み
        const zustandStorage = localStorage.getItem('review-setter-user-storage');
        if (zustandStorage) {
            const parsed = JSON.parse(zustandStorage);
            if (parsed.state?.theme) return parsed.state.theme;
        }

        // フォールバック: ThemeProvider独自のstorageKey、最後にdefaultTheme
        return localStorage.getItem(storageKey) || defaultTheme;
    })

    // Zustandのテーマが変更されたら、ThemeProviderのテーマも同期する
    useEffect(() => {
        if (zustandTheme && zustandTheme !== theme) {
            setTheme(zustandTheme)
            localStorage.setItem(storageKey, zustandTheme)
        }
    }, [zustandTheme, theme, storageKey])

    // themeの状態が変更されたら、<html>要素のクラスを更新してCSSを適用する
    useEffect(() => {
        const root = window.document.documentElement
        root.classList.remove("light", "dark")
        root.classList.add(theme)
    }, [theme])

    const value = {
        theme,
        setTheme: (newTheme: string) => {
            localStorage.setItem(storageKey, newTheme)
            setTheme(newTheme as ThemeColor)
        },
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

/**
 * 現在のテーマを取得し、テーマを変更するためのカスタムフック
 */
export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}