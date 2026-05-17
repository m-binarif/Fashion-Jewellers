import axios from 'axios';

// Create an Axios instance
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const ASSET_BASE = API_BASE.replace('/api/v1', '');

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const getAssetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${ASSET_BASE}${path}`;
};

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const isAdminPortal = window.location.pathname.startsWith('/admin');
    const tokenKey = isAdminPortal ? 'admin_token' : 'token';
    const token = localStorage.getItem(tokenKey);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle global errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the token is invalid or expired, we might want to trigger a logout
    // We can do this safely by checking the response status
    if (error.response && error.response.status === 401) {
      const isAdminPortal = window.location.pathname.startsWith('/admin');
      const tokenKey = isAdminPortal ? 'admin_token' : 'token';
      // Clear token
      localStorage.removeItem(tokenKey);
      // Dispatch a custom event to tell the app to log out (AuthContext listens to this)
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
