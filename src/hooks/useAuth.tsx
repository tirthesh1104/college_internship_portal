import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  pinLogin: (role: 'COORDINATOR' | 'ADMIN', securityPin: string) => Promise<User>;
  register: (data: any) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (role: Role | Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setUser(null);
      setLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const data = await api.get<User>('/auth/me/');
      setUser(data);
      localStorage.setItem('user_data', JSON.stringify(data));
    } catch {
      logout();
    }
  };

  const login = async (email: string, pass: string): Promise<User> => {
    const res: any = await api.post('/auth/login/', {
      email,
      password: pass,
    });
    const access = res.tokens?.access || res.access;
    const refresh = res.tokens?.refresh || res.refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user_data', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const pinLogin = async (role: 'COORDINATOR' | 'ADMIN', securityPin: string): Promise<User> => {
    const res: any = await api.post('/auth/login/', {
      role,
      security_pin: securityPin,
    });
    const access = res.tokens?.access || res.access;
    const refresh = res.tokens?.refresh || res.refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user_data', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const register = async (data: any): Promise<User> => {
    const res: any = await api.post('/auth/register/', data);
    const access = res.tokens?.access || res.access;
    const refresh = res.tokens?.refresh || res.refresh;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    localStorage.setItem('user_data', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    setUser(null);
  };

  const hasRole = (roles: Role | Role[]): boolean => {
    if (!user) return false;
    const allowed = Array.isArray(roles) ? roles : [roles];
    return allowed.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, pinLogin, register, logout, refreshUser, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
