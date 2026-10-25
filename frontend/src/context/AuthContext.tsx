import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "../types/auth.js";
import { api, setAuthToken, setOnUnauthorizedCallback } from "../api/client.js";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  sessionMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearSessionMessage: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setSessionMessage("Your session has expired. In-memory authentication requires re-login.");
    });
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setSessionMessage(null);
    const result = await api.login(email, password);
    setToken(result.token);
    setUser(result.user);
  };

  const register = async (email: string, password: string): Promise<void> => {
    setSessionMessage(null);
    await api.register(email, password);
  };

  const logout = (): void => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setSessionMessage(null);
  };

  const clearSessionMessage = (): void => {
    setSessionMessage(null);
  };

  const isAuthenticated = !!token && !!user;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        sessionMessage,
        login,
        register,
        logout,
        clearSessionMessage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
