import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "../api/client";
import { AuthUser, Role } from "../types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: Record<string, any>) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("hv_token");
    const cached = localStorage.getItem("hv_user");
    if (token && cached) {
      setUser(JSON.parse(cached));
      api
        .get("/auth/me")
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem("hv_user", JSON.stringify(res.data.user));
        })
        .catch(() => {
          localStorage.removeItem("hv_token");
          localStorage.removeItem("hv_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("hv_token", res.data.token);
    localStorage.setItem("hv_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user as AuthUser;
  }

  async function register(data: Record<string, any>) {
    const res = await api.post("/auth/register", data);
    localStorage.setItem("hv_token", res.data.token);
    localStorage.setItem("hv_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user as AuthUser;
  }

  function logout() {
    localStorage.removeItem("hv_token");
    localStorage.removeItem("hv_user");
    setUser(null);
  }

  async function refreshUser() {
    const res = await api.get("/auth/me");
    setUser(res.data.user);
    localStorage.setItem("hv_user", JSON.stringify(res.data.user));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function isPatient(role?: Role) {
  return role === "PATIENT";
}
