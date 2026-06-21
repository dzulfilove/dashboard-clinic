import { create } from 'zustand';
import { User } from '../types.js';

function sanitizeRole(role: any): 'admin' | 'perawat' | 'analis' | 'farmasi' {
  if (!role) return 'admin';
  let roleStr = '';
  
  if (typeof role === 'string') {
    if (role.trim().startsWith('[') || role.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(role);
        return sanitizeRole(parsed);
      } catch (e) {
        roleStr = role;
      }
    } else {
      roleStr = role;
    }
  } else if (Array.isArray(role)) {
    if (role.length === 0) return 'admin';
    return sanitizeRole(role[0]);
  } else if (typeof role === 'object' && role !== null) {
    const val = role.Value || role.value || role.name || role.Name || role.label || JSON.stringify(role);
    return sanitizeRole(val);
  } else {
    roleStr = String(role);
  }

  const clean = roleStr.toLowerCase().trim();
  if (clean.includes('admin') || clean.includes('it') || clean.includes('developer') || clean.includes('owner') || clean.includes('sys')) {
    return 'admin';
  } else if (clean.includes('perawat') || clean.includes('nurse')) {
    return 'perawat';
  } else if (clean.includes('analis') || clean.includes('analyst') || clean.includes('lab') || clean.includes('laboratorium')) {
    return 'analis';
  } else if (clean.includes('farmasi') || clean.includes('apotek') || clean.includes('apoteker')) {
    return 'farmasi';
  }

  return 'admin';
}

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
    try {
      const token = localStorage.getItem('clinic_token');
      const userStr = localStorage.getItem('clinic_user');
      if (token && userStr) {
        const rawUser = JSON.parse(userStr) as User;
        const sanitizedUser = { ...rawUser, role: sanitizeRole(rawUser.role) };
        set({ token, user: sanitizedUser, isAuthenticated: true });
      }
    } catch (err) {
      console.error('Failed to parse persistent auth user', err);
      localStorage.removeItem('clinic_token');
      localStorage.removeItem('clinic_user');
    }
  },
}));
