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

// Request interceptor to attach JWT token based on active portal context
api.interceptors.request.use(
  (config) => {
    const pathname = window.location.pathname;
    let token = null;

    if (pathname.startsWith('/admin')) {
      // Admin Portal: Strictly use admin_token from localStorage
      token = localStorage.getItem('admin_token');
    } else if (pathname.startsWith('/employee')) {
      // Employee Portal: Tab-isolated token from sessionStorage
      token = sessionStorage.getItem('employee_token');

      // If missing from generic session key, check route username
      if (!token) {
        const match = pathname.match(/^\/employee\/([^/]+)/);
        const username = match ? match[1] : null;
        if (username && username !== 'login') {
          token = sessionStorage.getItem(`employee_token_${username}`) ||
                  localStorage.getItem(`employee_token_${username}`);
        }
      }
    } else {
      // Customer / Public portal
      token = localStorage.getItem('token');
    }

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
    if (error.response && error.response.status === 401) {
      const pathname = window.location.pathname;

      if (pathname.startsWith('/admin')) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.dispatchEvent(new Event('admin:unauthorized'));
      } else if (pathname.startsWith('/employee')) {
        const match = pathname.match(/^\/employee\/([^/]+)/);
        const username = match ? match[1] : null;
        sessionStorage.removeItem('employee_token');
        sessionStorage.removeItem('employee_user');
        if (username && username !== 'login') {
          sessionStorage.removeItem(`employee_token_${username}`);
          localStorage.removeItem(`employee_token_${username}`);
        }
        window.dispatchEvent(new Event('employee:unauthorized'));
      } else {
        localStorage.removeItem('token');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
