import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'FACTORY' | 'BRANCH';
  branchId: string | null;
  branch: { id: string; name: string; code: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (token, user) => {
        localStorage.setItem('auth_token', token);
        set({ token, user, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({ token: null, user: null, isAuthenticated: false });
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),
    }),
    {
      name: 'mshalh-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
