'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string } | null;
  token: string | null;
  login: (
    token: string,
    user: { id: string; email: string; name: string }
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
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // On mount, check localStorage for token
    const storedToken = getLocalStorageItem('navo_token');
    const storedUser = getLocalStorageItem('navo_user');
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        console.error('Failed to parse stored user data:', e);
        // Clear invalid data
        removeLocalStorageItem('navo_token');
        removeLocalStorageItem('navo_user');
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
      }
    }
    setIsInitialized(true);
  }, []);

  const login = (
    newToken: string,
    newUser: { id: string; email: string; name: string }
  ) => {
    setLocalStorageItem('navo_token', newToken);
    setLocalStorageItem('navo_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    router.push('/'); // Redirect to home after login
  };

  const logout = () => {
    removeLocalStorageItem('navo_token');
    removeLocalStorageItem('navo_user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login'); // Redirect to login page after logout
  };

  // 초기화가 완료될 때까지 로딩 상태 표시
  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, token, login, logout }}
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
