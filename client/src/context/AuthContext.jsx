import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  getMeApi,
  loginApi,
  registerApi,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Logout clears token and resets user state
  const logout = useCallback(() => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  // Check current session on mount or token change
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const stored = getStoredToken();
      if (!stored) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await getMeApi();
        if (isMounted) {
          if (data && data.user) {
            setUser(data.user);
            setToken(stored);
          } else {
            logout();
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Authentication check failed:', err.message);
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  // Listen to 401 unauthorized events dispatched anywhere in the app
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('ishot:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('ishot:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  // Login handler
  const login = async (email, password) => {
    const data = await loginApi({ email, password });
    if (data.token && data.user) {
      setStoredToken(data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    throw new Error('Login failed: invalid response from server');
  };

  // Register handler
  const register = async (email, password) => {
    const data = await registerApi({ email, password });
    if (data.token && data.user) {
      setStoredToken(data.token);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    }
    throw new Error('Registration failed: invalid response from server');
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
