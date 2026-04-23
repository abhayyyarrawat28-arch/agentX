import { create } from 'zustand';

type AuthRole = 'agent' | 'admin';

interface AuthState {
  token: string | null;
  role: 'agent' | 'admin' | null;
  user: { name: string; employeeId: string; branchId: string } | null;
  setAuth: (token: string, role: AuthRole, user?: any) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token'),
  role: localStorage.getItem('role') as AuthRole | null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),

  setAuth: (token, role, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    set({ token, role, user: user || null });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    set({ token: null, role: null, user: null });
  },

  isAuthenticated: () => !!get().token,
}));
