import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to load user from token on initial mount
    const loadUser = async () => {
      const isAdminPortal = window.location.pathname.startsWith('/admin');
      const tokenKey = isAdminPortal ? 'admin_token' : 'token';
      const token = localStorage.getItem(tokenKey);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // We can fetch the user profile. But since roles are different,
        // we might need to rely on the token payload or a specific /me endpoint.
        // For simplicity, we just check /auth/me or similar, but we didn't implement a global /me.
        // Actually, we have /customers/me, but what if it's an admin or supplier?
        // Let's decode the token manually (basic base64 decode) to get the role and ID.
        
        // Safely decode Base64URL payload
        let base64Url = token.split('.')[1];
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        // Pad the base64 string
        const pad = base64.length % 4;
        if (pad) {
          if (pad === 1) throw new Error('InvalidLengthError');
          base64 += new Array(5 - pad).join('=');
        }
        
        const payloadStr = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(payloadStr);
        
        localStorage.setItem('last_role', payload.role);

        // Basic user object from token
        setUser({
          id: payload.sub,
          role: payload.role,
          name: payload.name || 'User',
          email: payload.email
        });
      } catch (err) {
        console.error('Failed to parse token', err);
        const isAdminPortal = window.location.pathname.startsWith('/admin');
        localStorage.removeItem(isAdminPortal ? 'admin_token' : 'token');
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Listen for unauthorized events from axios interceptor
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password, type = 'customer') => {
    try {
      const url = '/auth/login'; // unified login endpoint
      const response = await api.post(url, { email, password });
      
      if (response.data.success) {
        const { token } = response.data.data;
        const tokenKey = (type === 'admin' || type === 'employee') ? 'admin_token' : 'token';
        localStorage.setItem(tokenKey, token);
        
        let base64Url = token.split('.')[1];
        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        if (pad) {
          if (pad === 1) throw new Error('InvalidLengthError');
          base64 += new Array(5 - pad).join('=');
        }
        
        const payloadStr = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(payloadStr);
        
        if (type === 'admin' && payload.role !== 'admin') {
          return { success: false, message: 'Invalid credentials for admin portal' };
        }
        if (type === 'employee' && payload.role !== 'employee') {
          return { success: false, message: 'Invalid credentials for employee portal' };
        }

        localStorage.setItem('last_role', payload.role);
        
        setUser({
          id: payload.sub,
          role: payload.role,
          name: payload.name || 'User',
          email: payload.email
        });
        
        return { success: true };
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    const isAdminPortal = window.location.pathname.startsWith('/admin');
    const tokenKey = isAdminPortal ? 'admin_token' : 'token';
    localStorage.removeItem(tokenKey);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
