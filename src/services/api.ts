import axios from 'axios';
import { useAuthStore } from '../store/authStore.js';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor to dynamically inject the Bearer JWT token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token || localStorage.getItem('clinic_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to look for authentication/session expirations
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Session expired or unauthorized, trigger logout
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
export { api };
