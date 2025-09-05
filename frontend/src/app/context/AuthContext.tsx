'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

export interface AuthContextType {
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string } | null;
  token: string | null;
  isLoading: boolean;
  login: (
    token: string,
    user: { id: string; email: string; name: string },
  ) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// localStorage에 안전하게 접근하는 헬퍼 함수
const getLocalStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setLocalStorageItem = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

const removeLocalStorageItem = (key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    email: string;
    name: string;
  } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log('[AuthContext] Initializing...');
    try {
      const storedToken = getLocalStorageItem('navo_token');
      const storedUser = getLocalStorageItem('navo_user');
      console.log('[AuthContext] Stored Token:', storedToken);
      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
        console.log('[AuthContext] User restored from localStorage');
      }
    } catch (e) {
      console.error('[AuthContext] Failed to parse stored user data:', e);
      removeLocalStorageItem('navo_token');
      removeLocalStorageItem('navo_user');
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] Initialization complete. isLoading: false');
    }
  }, []);

  const login = (
    newToken: string,
    newUser: { id: string; email: string; name: string },
  ) => {
    console.log('[AuthContext] login function called.');
    setLocalStorageItem('navo_token', newToken);
    setLocalStorageItem('navo_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    console.log('[AuthContext] State updated after login. New token:', newToken);
    router.push('/');
  };

  const logout = () => {
    removeLocalStorageItem('navo_token');
    removeLocalStorageItem('navo_user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  console.log(
    '[AuthContext] Rendering. isLoading:',
    isLoading,
    'isAuthenticated:',
    isAuthenticated,
    'token:',
    !!token,
  );

  if (isLoading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, token, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}