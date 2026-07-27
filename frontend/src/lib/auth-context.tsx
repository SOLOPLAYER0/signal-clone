"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { User } from "./types";
import { api, getToken, setToken, clearToken } from "./api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: { username: string; phone: string; password: string; display_name: string; otp: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login(username, password);
    setToken(res.access_token);
    setUser(res.user);
    router.push("/chat");
  };

  const register = async (payload: { username: string; phone: string; password: string; display_name: string; otp: string }) => {
    const res = await api.register(payload);
    setToken(res.access_token);
    setUser(res.user);
    router.push("/chat");
  };

  const logout = () => {
    clearToken();
    setUser(null);
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
