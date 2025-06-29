import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import { login, logout, signup, fetchUser, verifyEmail } from '@/api/authApi';
import { useUserStore } from '@/store';
// import { CreateUserInput, LoginUserInput, VerifyEmailRequest } from '@/types';

/**
 * 認証関連のロジックをまとめたカスタムフック
 * APIコール、状態管理、画面遷移をこのフックで一元管理する
 */
export const useAuth = (options: { enabled?: boolean } = {}) => {
    const { t } = useTranslation();

    const { enabled = true } = options;
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
        refetchOnMount: enabled, // enabled=falseの場合はマウント時実行を無効化
        enabled: enabled, // 条件付きでクエリを有効にする
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
            queryClient.invalidateQueries({ queryKey: ['user'] });
            navigate('/');
            toast.success(t('notification.loginSuccess'));
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || t('notification.loginFailed');
            toast.error(message, { description: t('notification.checkCredentials') });
        }
    });

    const signupMutation = useMutation({
        mutationFn: signup,
        onSuccess: (_, variables) => {
            navigate('/verify', { state: { email: variables.email } });
            toast.success(t('notification.verificationCodeSent'), { description: t('notification.checkEmail') });
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || t('notification.loginFailed');
            toast.error(message, { description: t('validation.passwordRequirements') });
        }
    });

    const verifyEmailMutation = useMutation({
        mutationFn: verifyEmail,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
            navigate('/');
            toast.success(t('notification.emailVerified'));
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || t('notification.loginFailed');
            toast.error(message, { description: t('validation.invalidEmail') });
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
            toast.info(t('notification.loggedOut'));
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || t('notification.loginFailed');
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