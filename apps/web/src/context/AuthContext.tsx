import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api } from '../api/client';
import type { MeResponse, User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<MeResponse>('/me');
      setUser(me.user);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        console.warn('无法获取会话', error);
      }
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const me = await api.post<MeResponse>('/auth/login', { email, password });
    setUser(me.user);
    setReady(true);
    return me.user;
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string) => {
    const me = await api.post<MeResponse>('/auth/register', { email, password, displayName });
    setUser(me.user);
    setReady(true);
    return me.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      window.dispatchEvent(new Event('sy:logout'));
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((next: User) => setUser(next), []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout, refresh, updateUser }),
    [user, ready, login, register, logout, refresh, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}