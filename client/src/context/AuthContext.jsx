import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load customer user from token on initial mount
    const loadUser = async () => {
      // Do not load customer token on admin or employee routes
      const pathname = window.location.pathname;
      if (pathname.startsWith('/admin') || pathname.startsWith('/employee')) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        let base64Url = token.split('.')[1];
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        if (pad && pad !== 1) {
          base64 += new Array(5 - pad).join('=');
        }

        const payloadStr = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );

        const payload = JSON.parse(payloadStr);

        if (payload.role === 'customer') {
          setUser({
            id: payload.sub,
            role: payload.role,
            name: payload.name || 'Customer',
            email: payload.email,
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to parse customer token', err);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data.success) {
        const { token, user: userData } = response.data.data;

        if (userData.role !== 'customer') {
          return {
            success: false,
            message: 'Please use the appropriate staff portal to login.',
          };
        }

        localStorage.setItem('token', token);

        setUser({
          id: userData.id,
          role: userData.role,
          name: userData.name || 'Customer',
          email: userData.email,
        });

        return { success: true };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
