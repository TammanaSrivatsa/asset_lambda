import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/types/domain";
import { toast } from "sonner";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ??
  "http://localhost:8000/api";

export interface AuthUser {
  id: string;
  display_id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  must_change_password: boolean;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  forceChangePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function getAuthHeaders() {
  const token = getToken();
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("itsm.token");
}

function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("itsm.token", token);
}

function removeToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("itsm.token");
}

const ROLE_MAP: Record<string, Role> = {
  ADMIN: "admin",
  EMPLOYEE: "employee",
  IT_SUPPORT: "support",
  ASSET_MANAGER: "asset_manager",

  Admin: "admin",
  Employee: "employee",
  Manager: "asset_manager",
  "IT Support Team": "support",
};

function mapBackendRole(raw: string): Role {
  return ROLE_MAP[raw] ?? (raw as Role) ?? "employee";
}

function mapBackendUser(bu: any): AuthUser {
  const rawRole = bu.role ?? "EMPLOYEE";

  return {
    id: bu.userId,
    display_id: bu.userId,
    name: `${bu.firstName} ${bu.lastName}`,
    email: bu.email,
    role: mapBackendRole(rawRole),
    avatar:
      `${bu.firstName[0]}${bu.lastName[0]}`.toUpperCase(),
    must_change_password: bu.forcePasswordChange ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getToken();
    if (stored) {
      const cached = localStorage.getItem("itsm.employee");
      if (cached) {
        try {
          setUser(mapBackendUser(JSON.parse(cached)));
        } catch {
          removeToken();
          localStorage.removeItem("itsm.employee");
        }
      }
    }
    setLoading(false);
  }, []);

  const refreshProfile = async () => {
    const cached = localStorage.getItem("itsm.employee");
    if (cached) {
      try {
        setUser(mapBackendUser(JSON.parse(cached)));
      } catch {
        removeToken();
        localStorage.removeItem("itsm.employee");
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  const login = async (email: string, password: string): Promise<AuthUser> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (res.ok && body.user) {
        setToken("authenticated");
        const backendUser = {
          ...body.user,
          forcePasswordChange: body.forcePasswordChange,
        };

        localStorage.setItem(
          "itsm.employee",
          JSON.stringify(backendUser)
        );

const mapped = mapBackendUser(backendUser);
        setUser(mapped);
        toast.success(`Welcome back, ${mapped.name}`);
        return mapped;
      }
      throw new Error(body.message || "Login failed");
    } catch (err: any) {
      const message = err.message || "Unable to sign in. Please check your credentials.";
      toast.error(message);
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    removeToken();
    localStorage.removeItem("itsm.employee");
    toast.info("Signed out of session");
  };

  const forceChangePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    if (!user) {
      throw new Error("User not found.");
    }
    console.log("Password Change Request:", {
      email: user.email,
      currentPassword,
      newPassword,
    });

    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        currentPassword,
        newPassword,
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      throw new Error(body.message || "Failed to change password");
    }

    const cached = localStorage.getItem("itsm.employee");
    if (cached) {
      const backendUser = JSON.parse(cached);

      backendUser.forcePasswordChange = false;

      localStorage.setItem(
        "itsm.employee",
        JSON.stringify(backendUser)
      );

      setUser(mapBackendUser(backendUser));
    }

    toast.success("Password changed successfully!");
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, forceChangePassword, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}

export function getStoredEmployee(): AuthUser | null {
  try {
    const raw = localStorage.getItem("itsm.employee");
    if (!raw) return null;
    return mapBackendUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

export const ROLE_ROUTE: Record<Role, string> = {
  admin: "/admin",
  asset_manager: "/manager",
  employee: "/employee",
  support: "/support",
  lo_support: "/support",
};
