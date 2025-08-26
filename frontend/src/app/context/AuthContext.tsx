'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  user: { id: string; email: string; name: string } | null;
  token: string | null;
  login: (token: string, user: { id: string; email: string; name: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // On mount, check localStorage for token
    const storedToken = localStorage.getItem('navo_token');
    const storedUser = localStorage.getItem('navo_user');
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        console.error('Failed to parse stored user data:', e);
        // Clear invalid data
        localStorage.removeItem('navo_token');
        localStorage.removeItem('navo_user');
        setIsAuthenticated(false);
        setUser(null);
        setToken(null);
      }
    }
  }, []);

  const login = (newToken: string, newUser: { id: string; email: string; name: string }) => {
    localStorage.setItem('navo_token', newToken);
    localStorage.setItem('navo_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    router.push('/'); // Redirect to home after login
  };

  const logout = () => {
    localStorage.removeItem('navo_token');
    localStorage.removeItem('navo_user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login'); // Redirect to login page after logout
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, login, logout }}>
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