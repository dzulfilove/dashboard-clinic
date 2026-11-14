import { create } from 'zustand';
import { User } from '../types.js';
import { normalizeRole } from '../utils/role.js';

// GAGAL-TERTUTUP: nilai tak dikenal -> 'viewer' (sebelumnya 'admin').
const sanitizeRole = (role: any) => normalizeRole(role);

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  let initialToken = null;
  let initialUser = null;
  let initialIsAuthenticated = false;

  try {
    const token = localStorage.getItem('clinic_token');
    const userStr = localStorage.getItem('clinic_user');
    if (token && userStr) {
      const rawUser = JSON.parse(userStr) as User;
      const sanitizedUser = { ...rawUser, role: sanitizeRole(rawUser.role) };
      initialToken = token;
      initialUser = sanitizedUser;
      initialIsAuthenticated = true;
    }
  } catch (err) {
    console.error('Failed to parse persistent auth user', err);
    localStorage.removeItem('clinic_token');
    localStorage.removeItem('clinic_user');
  }

  return {
    token: initialToken,
    user: initialUser,
    isAuthenticated: initialIsAuthenticated,

    setAuth: (token, user) => {
      const sanitizedUser = { ...user, role: sanitizeRole(user.role) };
      localStorage.setItem('clinic_token', token);
      localStorage.setItem('clinic_user', JSON.stringify(sanitizedUser));
      set({ token, user: sanitizedUser, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('clinic_token');
      localStorage.removeItem('clinic_user');
      set({ token: null, user: null, isAuthenticated: false });
    },

    initialize: () => {
      // Keep for compatibility, though state is already initialized
    },
  };
});
