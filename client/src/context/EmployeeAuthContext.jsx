/**
 * EmployeeAuthContext.jsx — Completely isolated Employee Authentication Context.
 * Manages Employee Portal sessions with strict tab isolation and multi-employee support.
 * Never touches or conflicts with Admin Portal authentication state.
 */

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const EmployeeAuthContext = createContext();

export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    throw new Error('useEmployeeAuth must be used within an EmployeeAuthProvider');
  }
  return context;
};

function decodeToken(token) {
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
    return JSON.parse(payloadStr);
  } catch (_) {
    return null;
  }
}

export const EmployeeAuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and load employee session
  const loadEmployeeSession = () => {
    // 1. Extract target username from current path if on an employee route: /employee/:username/...
    const match = window.location.pathname.match(/^\/employee\/([^/]+)/);
    const routeUsername = match ? match[1] : null;

    let token = null;
    let storedUser = null;

    // Check tab-isolated sessionStorage first
    const sessionToken = sessionStorage.getItem('employee_token');
    const sessionUserStr = sessionStorage.getItem('employee_user');

    if (sessionToken) {
      const decoded = decodeToken(sessionToken);
      if (decoded && decoded.role === 'employee') {
        // If on a specific username route, check if this tab's session matches
        if (!routeUsername || routeUsername === 'login' || decoded.username === routeUsername) {
          token = sessionToken;
          try {
            storedUser = sessionUserStr ? JSON.parse(sessionUserStr) : null;
          } catch (_) {}
          if (!storedUser) {
            storedUser = {
              id: decoded.sub,
              role: decoded.role,
              name: decoded.name,
              username: decoded.username,
              roleName: decoded.roleName,
            };
          }
        }
      }
    }

    // If tab session didn't match routeUsername, check username-specific storage
    if (!token && routeUsername && routeUsername !== 'login') {
      const userToken = sessionStorage.getItem(`employee_token_${routeUsername}`) ||
                        localStorage.getItem(`employee_token_${routeUsername}`);
      if (userToken) {
        const decoded = decodeToken(userToken);
        if (decoded && decoded.role === 'employee' && decoded.username === routeUsername) {
          token = userToken;
          const userStr = sessionStorage.getItem(`employee_user_${routeUsername}`) ||
                          localStorage.getItem(`employee_user_${routeUsername}`);
          try {
            storedUser = userStr ? JSON.parse(userStr) : null;
          } catch (_) {}
          if (!storedUser) {
            storedUser = {
              id: decoded.sub,
              role: decoded.role,
              name: decoded.name,
              username: decoded.username,
              roleName: decoded.roleName,
            };
          }
          // Sync into current tab's active session
          sessionStorage.setItem('employee_token', token);
          sessionStorage.setItem('employee_user', JSON.stringify(storedUser));
        }
      }
    }

    if (token && storedUser) {
      setEmployee(storedUser);
    } else {
      setEmployee(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEmployeeSession();

    const handleUnauthorized = () => {
      setEmployee(null);
    };
    window.addEventListener('employee:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('employee:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data.success) {
        const { token, user } = response.data.data;

        if (user.role !== 'employee') {
          return {
            success: false,
            message: 'Invalid credentials for Employee Portal. Please use the Admin Portal.',
          };
        }

        const username = user.username;
        if (!username) {
          return {
            success: false,
            message: 'Employee record does not have a valid username assigned.',
          };
        }

        const employeeData = {
          id: user.id,
          role: 'employee',
          name: user.name || 'Employee',
          username: user.username,
          roleName: user.roleName || 'Employee',
          email: user.email,
        };

        // Tab-isolated storage
        sessionStorage.setItem('employee_token', token);
        sessionStorage.setItem('employee_user', JSON.stringify(employeeData));

        // Username-keyed storage for multi-employee and direct-link resilience
        sessionStorage.setItem(`employee_token_${username}`, token);
        sessionStorage.setItem(`employee_user_${username}`, JSON.stringify(employeeData));
        localStorage.setItem(`employee_token_${username}`, token);
        localStorage.setItem(`employee_user_${username}`, JSON.stringify(employeeData));

        setEmployee(employeeData);

        return {
          success: true,
          username: user.username,
          user: employeeData,
        };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Authentication failed. Please check your credentials.',
      };
    }
  };

  const logout = (username) => {
    // Clear tab-isolated session
    sessionStorage.removeItem('employee_token');
    sessionStorage.removeItem('employee_user');

    // Clear username-specific storage if provided
    const targetUser = username || employee?.username;
    if (targetUser) {
      sessionStorage.removeItem(`employee_token_${targetUser}`);
      sessionStorage.removeItem(`employee_user_${targetUser}`);
      localStorage.removeItem(`employee_token_${targetUser}`);
      localStorage.removeItem(`employee_user_${targetUser}`);
    }

    setEmployee(null);
  };

  return (
    <EmployeeAuthContext.Provider value={{ employee, user: employee, loading, login, logout, refreshSession: loadEmployeeSession }}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

export default EmployeeAuthContext;
