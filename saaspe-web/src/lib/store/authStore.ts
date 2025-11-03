import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;

  setAuth: (user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setAuth: (user) => {
        // Tokens are now stored in httpOnly cookies by backend
        // No need to store them in localStorage
        set({
          user,
          isAuthenticated: true,
        });
      },

      clearAuth: () => {
        // Clear Zustand persist storage
        // Cookies are cleared by backend on logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }

        set({
          user: null,
          isAuthenticated: false,
        });
      },

      updateUser: (updatedUser) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        }));
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        // Only persist user info (not tokens)
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
