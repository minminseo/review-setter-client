import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';


import { login, logout, signup, fetchUser, verifyEmail } from '@/api/authApi';
import { useUserStore } from '@/store';
// import { CreateUserInput, LoginUserInput, VerifyEmailRequest } from '@/types';

/**
 * Custom hook for authentication logic
 * Centralizes API calls, state management, and navigation
 */
export const useAuth = (options: { enabled?: boolean } = {}) => {


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
            // ログイン成功後、['user']クエリを無効化し、useQueryを再実行させる
            queryClient.invalidateQueries({ queryKey: ['user'] });
            navigate('/');
            toast.success("Logged in successfully.");
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "Login failed.";
            toast.error(message, { description: "Please check your email and password." });
        }
    });

    // サインアップ処理
    const signupMutation = useMutation({
        mutationFn: signup,
        onSuccess: (_, variables) => {
            navigate('/verify', { state: { email: variables.email } });
            toast.success("Verification code sent.", { description: "Please check your email." });
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "Signup failed.";
            toast.error(message, { description: "Please check your input." });
        }
    });

    const verifyEmailMutation = useMutation({
        mutationFn: verifyEmail,
        onSuccess: () => {
            // On successful email verification, invalidate ['user'] query to confirm auth state
            queryClient.invalidateQueries({ queryKey: ['user'] });
            navigate('/');
            toast.success("Email verification completed.");
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "Verification failed.";
            toast.error(message, { description: "The code is incorrect or has expired." });
        }
    });

    const logoutMutation = useMutation({
        mutationFn: logout,
        onSuccess: () => {
            clearUser();
            // On logout, clear all query cache
            queryClient.clear();
            // Explicitly set user query to undefined (error state)
            queryClient.setQueryData(['user'], undefined);
            // Redirect to login page
            navigate('/login', { replace: true });
            toast.info("Logged out");
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || "Logout failed";
            toast.error(message);
        }
    });

    // Auth state: Only consider authenticated if API query succeeds and user data exists
    // If error occurs, clearly mark as unauthenticated
    const actualIsAuthenticated = isSuccess && !!user;
    // Loading state: Only when initially loading and no error
    const actualIsUserLoading = isUserLoading;

    return {
        user,
        isUserLoading: actualIsUserLoading, // Properly manage loading state
        isAuthenticated: actualIsAuthenticated, // Auth state based on API query result
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