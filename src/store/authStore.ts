import { create } from 'zustand';
import { User } from '../types.js';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  setAuth: (token, user) => {
    localStorage.setItem('clinic_token', token);
    localStorage.setItem('clinic_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('clinic_token');
    localStorage.removeItem('clinic_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  initialize: () => {
    try {
      const token = localStorage.getItem('clinic_token');
      const userStr = localStorage.getItem('clinic_user');
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({ token, user, isAuthenticated: true });
      }
    } catch (err) {
      console.error('Failed to parse persistent auth user', err);
      localStorage.removeItem('clinic_token');
      localStorage.removeItem('clinic_user');
    }
  },
}));
