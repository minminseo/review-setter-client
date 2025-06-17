import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { login, logout, signup, fetchUser, verifyEmail } from '@/api/authApi';
import { useUserStore } from '@/store';
// import { CreateUserInput, LoginUserInput, VerifyEmailRequest } from '@/types';

/**
 * 認証関連のロジックをまとめたカスタムフック
 * APIコール、状態管理、画面遷移をこのフックで一元管理する
 */
export const useAuth = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { setUser, clearUser } = useUserStore();

    // 認証状態の「源泉」。このクエリが成功するかどうかで、有効なセッションを持つかを判断する。
    const { data: user, isLoading: isUserLoading, isSuccess, isError } = useQuery({
        queryKey: ['user'],
        queryFn: fetchUser,
        staleTime: 1000 * 60 * 30, // 30分間はキャッシュを有効にする
        retry: false, // 初回読み込みで失敗（401など）した場合、リトライしない
        refetchOnWindowFocus: false, // ウィンドウフォーカス時の自動再取得を無効化
        refetchOnMount: true, // マウント時は必ず実行
        enabled: true, // クエリを有効にする
    });

    // useQueryのv5の作法。コールバックの代わりにuseEffectで副作用を処理する。
    useEffect(() => {
        if (isSuccess && user) {
            // APIからユーザー情報が取得できたら、ストアを更新して「認証済み」とする
            setUser(user);
        }
        if (isError) {
            // エラーが発生した場合（セッション切れなど）、ストアをクリアして「未認証」とする
            clearUser();
        }
    }, [isSuccess, isError, user, setUser, clearUser]);

    // ログイン処理
    const loginMutation = useMutation({
        mutationFn: login,
        onSuccess: () => {
            // ログイン成功後、['user']クエリを無効化し、useQueryを再実行させる
            queryClient.invalidateQueries({ queryKey: ['user'] });
            navigate('/');
            toast.success("ログインしました。");
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "ログインに失敗しました。";
            toast.error(message, { description: "メールアドレスまたはパスワードを確認してください。" });
        }
    });

    const signupMutation = useMutation({
        mutationFn: signup,
        onSuccess: (_, variables) => {
            navigate('/verify', { state: { email: variables.email } });
            toast.success("確認コードを送信しました。", { description: "メールを確認してください。" });
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "サインアップに失敗しました。";
            toast.error(message, { description: "入力内容を確認してください。" });
        }
    });

    const verifyEmailMutation = useMutation({
        mutationFn: verifyEmail,
        onSuccess: () => {
            // メール認証成功後も同様に、['user']クエリを無効化して認証状態を確定させる
            queryClient.invalidateQueries({ queryKey: ['user'] });
            navigate('/');
            toast.success("メール認証が完了しました。");
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "認証に失敗しました。";
            toast.error(message, { description: "コードが間違っているか、有効期限が切れています。" });
        }
    });

    const logoutMutation = useMutation({
        mutationFn: logout,
        onSuccess: () => {
            clearUser();
            // ログアウト時は全てのクエリキャッシュをクリア
            queryClient.clear();
            // ユーザークエリを明示的にエラー状態にセット
            queryClient.setQueryData(['user'], undefined);
            // ログインページにリダイレクト
            navigate('/login', { replace: true });
            toast.info("ログアウトしました。");
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "ログアウトに失敗しました。";
            toast.error(message);
        }
    });

    // 認証状態の判定: APIクエリが成功してユーザーデータがある場合のみ認証済みとする
    // エラーが発生した場合は明確に未認証とする
    const actualIsAuthenticated = isSuccess && !!user;
    // ローディング状態: 初回読み込み中かつエラーが発生していない場合のみ
    const actualIsUserLoading = isUserLoading;

    return {
        user,
        isUserLoading: actualIsUserLoading, // ローディング状態を適切に管理
        isAuthenticated: actualIsAuthenticated, // APIクエリの結果に基づく認証状態
        login: loginMutation.mutate,
        isLoggingIn: loginMutation.isPending,
        signup: signupMutation.mutate,
        isSigningUp: signupMutation.isPending,
        verifyEmail: verifyEmailMutation.mutate,
        isVerifying: verifyEmailMutation.isPending,
        logout: logoutMutation.mutate,
        isLoggingOut: logoutMutation.isPending,
    };
};