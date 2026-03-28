"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type UserRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar: string;
  brandId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, name?: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Client-side permission check (mirrors server-side)
const PERMISSIONS: Record<string, UserRole[]> = {
  "brand:read": ["VIEWER", "EDITOR", "ADMIN", "OWNER"],
  "brand:edit": ["EDITOR", "ADMIN", "OWNER"],
  "brand:delete": ["OWNER"],
  "analysis:read": ["VIEWER", "EDITOR", "ADMIN", "OWNER"],
  "analysis:run": ["EDITOR", "ADMIN", "OWNER"],
  "content:read": ["VIEWER", "EDITOR", "ADMIN", "OWNER"],
  "content:create": ["EDITOR", "ADMIN", "OWNER"],
  "content:delete": ["ADMIN", "OWNER"],
  "team:read": ["ADMIN", "OWNER"],
  "team:invite": ["ADMIN", "OWNER"],
  "team:remove": ["OWNER"],
  "team:changeRole": ["OWNER"],
  "settings:read": ["VIEWER", "EDITOR", "ADMIN", "OWNER"],
  "settings:edit": ["ADMIN", "OWNER"],
  "settings:api-keys": ["OWNER"],
  "integrations:read": ["VIEWER", "EDITOR", "ADMIN", "OWNER"],
  "integrations:manage": ["ADMIN", "OWNER"],
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    setUser(data.user);
    return {};
  };

  const register = async (email: string, password: string, name?: string) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error };
    setUser(data.user);
    return {};
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    return PERMISSIONS[permission]?.includes(user.role) ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
