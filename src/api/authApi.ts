// 認証関連（ユーザー登録、ログイン、ログアウトなど）のAPI関数をまとめたファイル。
import api from './index';
import { GetUserOutput, LoginUserInput, CreateUserInput, VerifyEmailRequest, UpdateUserInput, UpdatePasswordRequest, LoginUserOutput, VerifyEmailResponse } from '@/types';

export const signup = async (data: CreateUserInput) => {
    const response = await api.post('/signup', data);
    return response.data;
};

export const login = async (data: LoginUserInput): Promise<LoginUserOutput> => {
    const response = await api.post<LoginUserOutput>('/login', data);
    return response.data;
};

export const logout = async () => {
    const response = await api.post('/logout');
    return response.data;
};

export const verifyEmail = async (data: VerifyEmailRequest): Promise<VerifyEmailResponse> => {
    const response = await api.post<VerifyEmailResponse>('/verify-email', data);
    return response.data;
};

export const fetchUser = async (): Promise<GetUserOutput> => {
    const response = await api.get<GetUserOutput>('/user');
    return response.data;
};

export const updateUser = async (data: UpdateUserInput) => {
    const response = await api.put('/user', data);
    return response.data;
}

export const updatePassword = async (data: UpdatePasswordRequest) => {
    await api.put('/user/password', data);
}