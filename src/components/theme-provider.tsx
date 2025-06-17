import { createContext, useContext, useEffect, useState } from "react"

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
    const [theme, setTheme] = useState(
        // localStorageから保存されたテーマを読み込むか、なければデフォルト値を使用
        () => localStorage.getItem(storageKey) || defaultTheme
    )

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
            setTheme(newTheme)
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