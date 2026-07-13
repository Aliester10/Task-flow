import api from './api';
import { User } from '../types';

export const authService = {
  register: async (data: { name: string; email: string; password: string }) => {
    const res = await api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/register', data);
    return res.data.data!;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await api.post<{ success: boolean; data: { user: User; token: string } }>('/auth/login', data);
    return res.data.data!;
  },
  getMe: async () => {
    const res = await api.get<{ success: boolean; data: User }>('/auth/me');
    return res.data.data!;
  },
  updateProfile: async (data: { name?: string; avatarUrl?: string | null; password?: string; currentPassword?: string }) => {
    const res = await api.put<{ success: boolean; data: User }>('/auth/me', data);
    return res.data.data!;
  },
};
