# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server with hot reloading
- `npm run build` - Type check with `tsc -b` then build for production
- `npm run lint` - Run ESLint on all files
- `npm run preview` - Preview production build locally

### Notes
- No test framework is currently configured
- TypeScript compilation is done with `tsc -b` before building

## Architecture Overview

This is a React + TypeScript + Vite spaced repetition learning application with the following key architectural patterns:

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Routing**: React Router DOM v7 with protected routes
- **State Management**: Zustand with persistence middleware
- **Server State**: TanStack React Query for API calls and caching
- **Styling**: Tailwind CSS v4 with Radix UI components
- **HTTP Client**: Axios with CSRF token support
- **Internationalization**: react-i18next (Japanese/English)
- **Theme**: next-themes for dark/light mode

### Core Application Flow
1. **Initialization**: App starts by fetching CSRF token via `setupCsrfToken()`
2. **Authentication**: Uses `useAuth` hook to check `/user` endpoint and manage auth state
3. **Protected Routes**: `ProtectedRoute` component wraps authenticated pages
4. **Layout Structure**: `AppLayout` (authenticated) vs `AuthLayout` (login/signup)

### Key Architectural Patterns

#### State Management
- **Zustand Stores**: Located in `/src/store/` - manages global app state
  - `userStore` - Authentication state, user preferences (theme, language)
  - `categoryStore`, `boxStore`, `patternStore`, `itemStore` - Domain-specific state
- **React Query**: Manages server state, caching, and API calls
- **Persistence**: User preferences persisted to localStorage via Zustand middleware

#### API Integration
- **Base API Client**: `/src/api/index.ts` exports configured axios instance
- **CSRF Protection**: Automatic CSRF token setup on app initialization
- **Domain APIs**: `/src/api/` contains modular API functions (authApi, boxApi, etc.)
- **withCredentials**: Enabled for cookie-based authentication

#### Component Architecture
- **Layout Components**: `/src/components/layout/` - AppLayout, AuthLayout, Sidebar
- **Modal System**: All modals in `/src/components/modals/` with centralized state management
- **Shared Components**: `/src/components/shared/` - reusable business components
- **UI Components**: `/src/components/ui/` - Radix-based design system components
- **Pages**: `/src/pages/` organized by feature area (Auth/, App/)

#### Routing Structure
```
/ (protected) - HomePage
/patterns (protected) - PatternsPage  
/categories/:categoryId (protected) - CategoryPage
/categories/:categoryId/boxes/:boxId (protected) - BoxPage
/today (protected) - TodaysReviewPage
/login, /signup, /verify (public) - Auth pages
```

#### Type System
- **Centralized Types**: All TypeScript interfaces in `/src/types/index.ts`
- **API-First**: Types match backend API contracts exactly
- **Domain Models**: User, Category, Box, Pattern, Item, ReviewDate with full relationships

### Import Aliases
- `@/*` maps to `./src/*` for clean imports

### Internationalization
- Supports Japanese (ja) and English (en)
- User language preference stored in Zustand and localStorage
- Translation files in `/src/i18n/locales/`

### Styling Conventions
- Tailwind CSS v4 with PostCSS
- Dark theme as default (`defaultTheme="dark"`)
- Radix UI primitives for accessibility
- Responsive design with mobile-first approach

### Security
- CSRF token automatically included in all POST/PUT/DELETE requests
- Cookie-based authentication with `withCredentials: true`
- Protected route system prevents unauthorized access


### アプリケーション(画面遷移など)
# 認証フロー
- `ログイン画面` → `サインアップ画面` に遷移
- `サインアップ画面` → `認証コード入力画面` に遷移
- `認証コード入力画面` → `ホーム画面` に遷移
- `ログイン画面` → `ホーム画面` に遷移

# サイドバー
- `サイドバー` → `ホーム画面`に遷移（家マークボタン）
- `サイドバー` → `復習物作成モーダル` を開く（青色のプラスマークボタン）
- `サイドバー` → `復習パターン作成モーダル` を開く（灰色のプラスマークボタン）
- `サイドバー` → `設定画面モーダル` を開く（一番下の人のもようのマークボタン）

# ホーム画面
- `ホーム画面` → `今日の復習画面` に遷移
- `ホーム画面` → `カテゴリー内部画面` に遷移
- `ホーム画面` → `復習パターン一覧画面（編集用）` を開く
- `ホーム画面` → `カテゴリー編集モーダル` を開く
- `ホーム画面` → `カテゴリー作成モーダル` を開く

# カテゴリー内部画面〜ボックス内部画面共通（カテゴリー、ボックスの選択タブ（縦2列のとこ））
- `カテゴリー一覧選択モーダル` を開く（選択肢が見切れている場合）（カテゴリータブから）
- `ボックス一覧選択モーダル` を開く（選択肢が見切れている場合）（ボックスタブから）
- `カテゴリー内部画面` に遷移（カテゴリータブから）（カテゴリータブの未分類に遷移する場合、この「カテゴリー内部画面」のコンポーネントを使うが、表示するのは必ずユーザー直下の唯一の未分類ボックス一つのみということになる（category_idがNULLでbox_idがNULLのボックスのこと）。このユーザー直下の未分類復習物ボックスは実質ホーム画面から遷移できる未分類復習物ボックスと同一のものである。
- `復習物ボックス内部画面` に遷移（ボックスタブから）

## カテゴリー内部画面〜ボックス内部画面共通（右上の「今日の復習」画面のボタン）
- 今日の復習画面 に遷移（その時にユーザーが選択したカテゴリーとボックスの選択肢状態をもとにその条件の「今日の復習」画面に遷移する）

## カテゴリー内部画面(category_id毎)
- `カテゴリー内部画面` → `復習物ボックス内部画面` に遷移
- `カテゴリー内部画面` → `復習物ボックス作成モーダル` を開く
- `カテゴリー内部画面` → `復習物ボックス編集モーダル` を開く
- `カテゴリー内部画面` → `カテゴリー編集モーダル` を開く
- `カテゴリー内部画面` → `並び替えドロップダウンメニュー` を開く

# 復習物ボックス内部画面(box_id毎)
- `復習物ボックス内部画面` → `完了済み復習物一覧表示モーダル` を開く（「完了済みボックスを確認」ボタンを押す）
- `復習物ボックス内部画面` → `復習物編集モーダル` を開く（各復習物の歯車マークの列の三点リーダーのボタンを押す）
- `復習物ボックス内部画面` → `復習日変更モーダル` を開く（変更したい復習日をボタンとして押す）
- `復習物ボックス内部画面` → `復習物ボックス概要モーダル` を開く（右上あたりの白丸の「i」ボタンを押す）
- `復習物ボックス内部画面` → `復習物ボックス編集モーダル` を開く（右上あたりの「歯車」ボタンを押す）
- `復習物ボックス内部画面` → `復習物詳細表示モーダル` を開く（テーブルの「詳細」列の各復習物のボタン）

# 今日の復習画面（共通）
- `カテゴリー一覧選択モーダル` を開く（選択肢が見切れている場合）（カテゴリータブから）
- `ボックス一覧選択モーダル` を開く（選択肢が見切れている場合）（ボックスタブから）
- カテゴリータブが全ての状態でこのレイヤーへ移動ボタンをおしたら「ホーム画面」に遷移
- ボックスタブが全ての状態でこのレイヤーへ移動ボタンへ押したら、その時に選択されているカテゴリーのカテゴリー内部画面へ遷移
- ボックスタブで何かしらのボックスが選択されている状態でこのレイヤーへ移動ボタンを押したらその時のカテゴリータブとボックスタブの選択状態のcategory_idとbox_idをもとに該当するボックス内部画面へ遷移

## 今日の復習画面（カテゴリータブとボックスタブの選択状態で動的に表示が変化する部分）
- `今日の復習画面` → `復習物編集モーダル` を開く
- `今日の復習画面` → `復習日変更モーダル` を開く

# 復習パターン一覧画面
- `復習パターン一覧画面` → `復習パターン変更モーダル` を開く
- `復習パターン一覧画面` → `並び替えドロップダウンメニュー` を開く

# 各種作成・編集モーダル内
- `復習物作成モーダル` / `復習物編集モーダル` → `カテゴリー一覧選択モーダル` を開く
- `復習物作成モーダル` / `復習物編集モーダル` → `calender(shadcn)` を開く
- `復習物作成モーダル` / `復習物編集モーダル` → `復習パターン一覧モーダル(選択用)` を開く
- `復習物作成モーダル` / `復習物編集モーダル` → `ボックス一覧選択モーダル` を開く
- `復習物ボックス作成モーダル` / `復習物ボックス編集モーダル` → `復習パターン一覧モーダル（選択用）` を開く

## 完了済み復習日一覧モーダル
- 「詳細」列の各復習物のノートみたいなマークのボタンを押すと復習物詳細表示モーダルが開く。


### アプリケーション（APIコールなど）
# 認証・ユーザーフロー

## サインアップ画面 (`サインアップ画面.png`)
- **目的:** 新規ユーザー登録を行う
- **API:** `POST /signup`

## 認証コード入力画面 (`認証コード入力画面.png`)
- **目的:** メールで送信された認証コードを検証する
- **API:** `POST /verify-email`

## ログイン画面 (`ログイン画面.png`)
- **目的:** 既存ユーザーがログインする
- **API:** `POST /login`

## 設定画面モーダル (`設定画面モーダル.png`)
- **目的:** ユーザー設定情報を表示・更新する
- **API (表示時):** `GET /user`（サイドバーからクリックされたとき）
- **API (保存時):** `PUT /user`



# ホーム画面 (`ホーム画面.png`)

- **目的:** カテゴリー一覧と各サマリー（復習数など）を表示する（サイドバーのホームボタン、もしくは左上のBreadcrumbコンポーネントのHomeボタンをクリックされたとき）
- **API (カテゴリー一覧取得):** `GET /categories`
- **API (今日の復習総数):** `GET /summary/daily-reviews/count?today={現在の日付}`
- **API (カテゴリー毎の今日の復習数):** `GET /summary/daily-reviews/count/unclassified/by-category?today={現在の日付}` と `GET /summary/daily-reviews/count/by-box?today={現在の日付}` と `GET /summary/daily-reviews/count/unclassified?today={現在の日付}` の結果をクライアント側で集計
- **API (カテゴリー毎の未完了アイテム総数):** `GET /summary/items/count/unclassified` と `GET /summary/items/count/by-box`と`GET /summery/items/count/unclassified/by-category` の結果をクライアント側で集計

# カテゴリー関連

## カテゴリー作成モーダル (`カテゴリー作成モーダル.png`)
- **目的:** 新しいカテゴリーを作成する
- **API:** `POST /categories`

## カテゴリー編集モーダル (`カテゴリー編集モーダル.png`)
- **目的:** 既存カテゴリーの名前を編集、またはカテゴリーを削除する
- **API (更新時):** `PUT /categories/{id}`
- **API (削除時):** `DELETE /categories/{id}`

## カテゴリー内部画面 (`カテゴリー内部画面.png`)
- **目的:** 特定のカテゴリーに属するボックス一覧を表示する
- **API (ボックス一覧取得):** `GET /{category_id}/boxes`
- **API (各ボックスのサマリー):** ホーム画面同様、`/summary/*` 系エンドポイントの結果をクライアント側でフィルタリングして使用

## カテゴリー一覧選択モーダル (`カテゴリー一覧選択モーダル.png`)
- **目的:** ユーザーの全カテゴリーを一覧表示し、選択させる
- **API:** `GET /categories`

# ボックス（復習物ボックス）関連

## 復習物ボックス作成モーダル (`復習物ボックス作成モーダル.png`)
- **目的:** 特定のカテゴリー内に新しいボックスを作成する
- **API (パターン一覧取得):** `GET /patterns` (モーダル内のパターン選択用)（未選択でも作成可能）
- **API (作成実行):** `POST /{category_id}/boxes`

## 復習物ボックス編集モーダル (`復習物ボックス編集モーダル.png`)
- **目的:** 既存ボックスの名前や適用パターンを編集、またはボックスを削除する
- **API (パターン一覧取得):** `GET /patterns` (モーダル内のパターン選択用)
- **API (更新時):** `PUT /{category_id}/boxes/{id}`
- **API (削除時):** `DELETE /{category_id}/boxes/{id}`

## 復習物ボックス内部画面 (`復習物ボックス内部画面.png`)
- **目的:** 特定のボックスに属する未完了の復習物アイテムを一覧表示する
- **API:** `GET /items/{box_id}`

## 復習物ボックス概要モーダル (`復習物ボックス概要モーダル.png`)
- **目的:** ボックスの概要（カテゴリー名、ボックス名、適用パターン等）を表示する
- **API:** 親画面（カテゴリー内部画面）で取得済みの `GET /{category_id}/boxes` や `GET /patterns` のデータを利用するため、このモーダルを開くための個別APIコールは不要

## ボックス一覧選択モーダル (`ボックス一覧選択モーダル.png`)
- **目的:** 特定カテゴリーの全ボックスを一覧表示し、選択させる
- **API:** `GET /{category_id}/boxes`

# カテゴリー内部からボック内部画面を開いてる時に上部に表示されるカテゴリー選択タブとボックス選択タブについて
- **目的:** ユーザーの全カテゴリーを上部のタブに一覧表示し、選択させる（未分類含む）
- **API:** `GET /categories`
- **API (ボックス一覧取得):** `GET /{category_id}/boxes`
- **API:** `GET /:items//unclassified`
- **目的:** ユーザーのそのカテゴリーの全ボックスを上部のタブに一覧表示し、選択させる（未分類含む）
- **API (ボックス一覧取得):** `GET /{category_id}/boxes`
- **API:** `GET /items/{box_id}`
- **API:** `GET /items/unclassified/:category_id`

# 復習パターン関連

## 復習パターン一覧画面（編集用） (`復習パターン一覧画面（編集用）.png`)
- **目的:** 全ての復習パターンを一覧表示する
- **API:** `GET /patterns`

## 復習パターン作成モーダル (`復習パターン作成モーダル.png`)
- **目的:** 新しい復習パターンを作成する
- **API:** `POST /patterns`

## 復習パターン変更モーダル (`復習パターン変更モーダル.png`)
- **目的:** 既存の復習パターンを編集、または削除する
- **API (更新時):** `PUT /patterns/{id}`
- **API (削除時):** `DELETE /patterns/{id}`

## 復習パターン一覧モーダル（選択用） (`復習パターン一覧モーダル（選択用）.png`)
- **目的:** 復習パターンを一覧表示し、選択させる
- **API:** `GET /patterns`

# 復習物アイテム・復習日関連

## 今日の復習画面 (`今日の復習画面.png`)
- **目的:** 今日の日付でスケジュールされている全復習アイテムを表示し、完了操作を行う
- **API (カテゴリータブ、ボックスタブの選択状況に合わせて今日の復習を一覧表示):** `GET /items/today?today={現在の日付}`
- **API (復習を完了にする):** `PATCH /items/{item_id}/review-dates/{review_date_id}/complete`
- **API (完了を取り消す):** `PATCH /items/{item_id}/review-dates/{review_date_id}/incomplete`

## 復習物作成モーダル (`復習物作成モーダル.png`)
- **目的:** 新しい復習物アイテムを作成する
- **API (カテゴリー/ボックス/パターン選択肢取得):** `GET /categories`, `GET /{category_id}/boxes`, `GET /patterns`（ここはその時開いている画面の状況に合わせてカテゴリーやボックス、復習パターンのデフォルト値を動的に設定する。）
- **API (作成実行):** `POST /items`

## 復習物編集モーダル (`復習物編集モーダル.png`)
- **目的:** 既存の復習物アイテムを編集、または削除する
- **API (カテゴリー/ボックス/パターン選択肢取得):** `GET /categories`, `GET /{category_id}/boxes`, `GET /patterns`（当然その復習物の設定されている状態で選択肢はデフォルト設定）
- **API (更新時):** `PUT /items/{item_id}`
- **API (削除時):** `DELETE /items/{item_id}`
- **API (途中完了にする):** `PATCH /items/{item_id}/finish`

## 復習日変更モーダル (`復習日変更モーダル.png`)
- **目的:** 特定の復習日のスケジュールを変更する
- **API:** `PUT /items/{item_id}/review-dates/{review_date_id}`

## 完了済み復習物一覧表示モーダル (`完了済み復習物一案表示モーダル.png`)
- **目的:** 完了済みの復習物アイテムを一覧表示する
- **API (一覧表示):** コンテキストに応じて `GET /items/finished/{box_id}` や `GET /items/finished/unclassified/{category_id}` 等をコール
- **API (復習を再開する):** `PATCH /items/{item_id}/unfinish`
- **API (完了を取り消す):** `PATCH /items/{item_id}/review-dates/{review_date_id}/incomplete`（もし最後のステップの日が今日なら、それはまだ完了未完了操作が可能な復習日なので、その場合は再開ではなく取消を表示して、このエンドポイントを叩くようにする）

## 復習物詳細表示モーダル (`復習物詳細表示モーダル.png`)
- **目的:** 復習物の詳細情報を表示する
- **API:** 親画面（ボックス内部画面など）で取得済みの `GET /items/{box_id}` のデータ内の`detail`フィールドを利用するため、このモーダルを開くための個別APIコールは不要