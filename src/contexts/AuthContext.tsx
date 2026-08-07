import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { apiFetch } from "@/utils/api";

interface Profile {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  mobile_no?: string | null;
  organization_id: string | null;
  organization_name?: string | null;
  organization_logo?: string | null;
  is_approved: boolean;
  uhid: string | null;
  role?: string | null;
  ams_role?: "coach" | "athlete" | "client" | "sports_scientist" | null;
  profession?: string | null;
  has_calendar_access?: boolean;
  has_analytics_access?: boolean;
  has_assign_work_access?: boolean;
}

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  clientId: string | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  clientId: null,
  roles: [],
  loading: true,
  signOut: async () => {},
  refreshAuth: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem("ishpo_jwt");
    if (!token) {
      setUser(null);
      setProfile(null);
      setRoles([]);
      setClientId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await apiFetch<{ user: any; profile: Profile; roles: string[]; clientId?: string }>("/auth/me");
      setUser(data.user);
      setProfile(data.profile);
      setRoles(data.roles || []);
      setClientId(data.clientId || null);
    } catch (err) {
      console.error("Failed to fetch user session from backend:", err);
      localStorage.removeItem("ishpo_jwt");
      setUser(null);
      setProfile(null);
      setRoles([]);
      setClientId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (!user) return;

    // Send active app usage ping every 30s when window/document is focused
    const pingInterval = setInterval(() => {
      if (document.hasFocus()) {
        apiFetch('/auth/active-ping', { method: 'POST' }).catch(() => {});
      }
    }, 30000);

    if (document.hasFocus()) {
      apiFetch('/auth/active-ping', { method: 'POST' }).catch(() => {});
    }

    return () => clearInterval(pingInterval);
  }, [user]);

  const signOut = async () => {
    localStorage.removeItem("ishpo_jwt");
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, profile, clientId, roles, loading, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}
