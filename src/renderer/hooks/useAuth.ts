import { useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  getProfile,
  setToken,
  clearToken,
  User,
} from '../lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      const { data, error } = await getProfile();
      if (error || !data) {
        clearToken();
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      setState({ user: data, isLoading: false, isAuthenticated: true });
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await apiLogin(email, password);

    if (error || !data) {
      return { success: false, error: error || 'Login failed' };
    }

    setToken(data.token);
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
    return { success: true };
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const { data, error } = await apiRegister(email, password, name);

      if (error || !data) {
        return { success: false, error: error || 'Registration failed' };
      }

      setToken(data.token);
      setState({ user: data.user, isLoading: false, isAuthenticated: true });
      return { success: true };
    },
    []
  );

  const logout = useCallback(() => {
    clearToken();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await getProfile();
    if (data) {
      setState((prev) => ({ ...prev, user: data }));
    }
  }, []);

  return {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    isPremium: state.user?.premium ?? false,
  };
}
