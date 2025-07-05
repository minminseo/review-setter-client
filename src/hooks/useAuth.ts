import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { login, logout, signup, fetchUser, verifyEmail } from '@/api/authApi';
import { useUserStore } from '@/store';
import { useAuthTexts } from '@/store/authLanguageStore';


export const useAuth = (options: { enabled?: boolean } = {}) => {
    const { enabled = true } = options;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { setUser, clearUser } = useUserStore();
    const texts = useAuthTexts();

    // 有効なセッションを持つかを判断。
    const { data: user, isLoading: isUserLoading, isSuccess, isError } = useQuery({
        queryKey: ['user'],
        queryFn: fetchUser,
        staleTime: 1000 * 60 * 30,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnMount: enabled,
        refetchOnReconnect: false,
        enabled: enabled,
    });

    useEffect(() => {
        if (isSuccess && user) {
            setUser(user);
        }
        if (isError) {
            clearUser();
        }
    }, [isSuccess, isError, user, setUser, clearUser]);

    // ログイン処理
    const loginMutation = useMutation({
        mutationFn: login,
        onSuccess: () => {
            // ログイン成功後、'user'クエリを無効化し、useQueryを再実行させる
            queryClient.invalidateQueries({ queryKey: ['user'] });
            navigate('/');
            toast.success(texts.loginSuccess);
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || texts.loginFailed;
            toast.error(message, { description: texts.loginErrorDescription });
        }
    });

    // サインアップ処理
    const signupMutation = useMutation({
        mutationFn: signup,
        onSuccess: (_, variables) => {
            navigate('/verify', { state: { email: variables.email } });
            toast.success(texts.signupSuccess);
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || texts.signupFailed;
            toast.error(message, { description: texts.signupErrorDescription });
        }
    });

    const verifyEmailMutation = useMutation({
        mutationFn: verifyEmail,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
            navigate('/');
            toast.success(texts.verificationSuccess);
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || texts.verificationFailed;
            toast.error(message, { description: texts.verificationErrorDescription });
        }
    });

    const logoutMutation = useMutation({
        mutationFn: logout,
        onSuccess: () => {
            clearUser();
            queryClient.cancelQueries({ queryKey: ['user'] });
            queryClient.removeQueries({ queryKey: ['user'] });
            queryClient.setQueryData(['user'], null);
            queryClient.setQueryDefaults(['user'], { enabled: false });
            navigate('/login', { replace: true });
            setTimeout(() => {
                queryClient.clear();
                queryClient.setQueryDefaults(['user'], { enabled: true });
            }, 100);
            toast.info(texts.logoutInfo);
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || texts.logoutFailed;
            toast.error(message);
        }
    });

    const actualIsAuthenticated = isSuccess && !!user;
    const actualIsUserLoading = isUserLoading;

    return {
        user,
        isUserLoading: actualIsUserLoading,
        isAuthenticated: actualIsAuthenticated,
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