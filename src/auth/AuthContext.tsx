// Auth context: giữ phiên đăng nhập TNV, persist vào AsyncStorage.
// Đồng bộ pattern với webapp (session lưu user), nhưng đơn giản hoá cho mobile.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '../types';
import { login as apiLogin } from '../api';

const SESSION_KEY = 'grotto-mobile-session-v1';

interface AuthValue {
  user: User | null;
  /** true trong lúc khôi phục phiên từ AsyncStorage lần đầu. */
  restoring: boolean;
  signingIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  // Khôi phục phiên khi app khởi động.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) setUserState(JSON.parse(raw) as User);
      } catch {
        // phiên hỏng → bắt đầu lại
      } finally {
        setRestoring(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    try {
      const u = await apiLogin(email, password);
      setUserState(u);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setUserState(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  }, []);

  const setUser = useCallback((u: User) => {
    setUserState(u);
    void AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
  }, []);

  const value = useMemo(
    () => ({ user, restoring, signingIn, signIn, signOut, setUser }),
    [user, restoring, signingIn, signIn, signOut, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng trong <AuthProvider>');
  return ctx;
}
