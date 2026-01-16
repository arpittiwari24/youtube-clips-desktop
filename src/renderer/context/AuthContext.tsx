import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isPremium: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    isPremium: state.user?.premium ?? false,
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
