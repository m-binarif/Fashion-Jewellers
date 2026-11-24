/**
 * AdminAuthContext.jsx — Completely isolated Admin Authentication Context.
 * Manages Admin Portal session, independent of Employee or Customer logins.
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdmin = () => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        setAdmin(null);
        setLoading(false);
        return;
      }

      try {
        // Decode Base64URL JWT payload safely
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

        // Verify this token belongs strictly to an admin
        if (payload.role === 'admin') {
          // Check expiration
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            setAdmin(null);
          } else {
            setAdmin({
              id: payload.sub,
              role: 'admin',
              name: payload.name || 'System Admin',
              email: payload.email,
            });
          }
        } else {
          // Not an admin token — do not load into admin state
          setAdmin(null);
        }
      } catch (err) {
        console.error('Failed to parse admin token', err);
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };

    loadAdmin();

    const handleUnauthorized = () => {
      setAdmin(null);
    };
    window.addEventListener('admin:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('admin:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data.success) {
        const { token, user } = response.data.data;

        if (user.role !== 'admin') {
          return {
            success: false,
            message: 'Invalid credentials for Admin Portal. Please use the Employee Portal.',
          };
        }

        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_user', JSON.stringify(user));

        setAdmin({
          id: user.id,
          role: 'admin',
          name: user.name || 'System Admin',
          email: user.email,
        });

        return { success: true };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setAdmin(null);
  };

  return (
    <AdminAuthContext.Provider value={{ admin, user: admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export default AdminAuthContext;
