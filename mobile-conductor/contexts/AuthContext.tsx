import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextData {
  isAuthenticated: boolean;
  user: any | null; // Tipar esto correctamente más adelante
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextData | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);

  const login = async () => {
    // Implementar lógica de login usando /api/v1/auth/login
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
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
