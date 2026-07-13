import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import { authService } from '../services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { user, token } = await authService.login({ email, password });
          localStorage.setItem('taskflow_token', token);
          set({ user, token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true });
        try {
          const { user, token } = await authService.register({ name, email, password });
          localStorage.setItem('taskflow_token', token);
          set({ user, token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('taskflow_token');
        set({ user: null, token: null });
      },

      updateUser: (user) => set({ user }),

      fetchMe: async () => {
        try {
          const user = await authService.getMe();
          set({ user });
        } catch {
          // token expired, clear
          localStorage.removeItem('taskflow_token');
          set({ user: null, token: null });
        }
      },
    }),
    { name: 'taskflow_auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);
