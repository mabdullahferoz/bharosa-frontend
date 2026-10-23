import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "./api";
import type { Me, Meta, Permission } from "./types";

interface AuthState {
  user: Me | null;
  meta: Meta | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<Me>;
  register: (data: Record<string, unknown>) => Promise<Me>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (u: Me) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return;
    try {
      setUser(await api.get<Me>("/me"));
    } catch {
      logout();
    }
  }, [logout]);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    api.get<Meta>("/meta").then(setMeta).catch(() => undefined);
    refresh().finally(() => setLoading(false));
  }, [logout, refresh]);

  const login = async (phone: string, password: string) => {
    const r = await api.post<{ token: string; user: Me }>("/auth/login", { phone, password });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  };

  const register = async (data: Record<string, unknown>) => {
    const r = await api.post<{ token: string; user: Me }>("/auth/register", data);
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  };

  return (
    <AuthContext.Provider value={{ user, meta, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const homeFor = (role: string) =>
  role === "ADMIN" || role === "SUPER_ADMIN" ? "/admin" : role === "WORKER" ? "/worker" : "/household";

export const isStaffRole = (role: string | undefined) => role === "ADMIN" || role === "SUPER_ADMIN";

/** True when the logged-in staff member holds `perm` (super admins hold every permission). */
export function hasPerm(user: Me | null, perm: Permission) {
  if (!user?.staff) return false;
  return user.role === "SUPER_ADMIN" || user.staff.permissions.includes("*") || user.staff.permissions.includes(perm);
}
