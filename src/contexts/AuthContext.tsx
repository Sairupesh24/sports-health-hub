import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  mobile_no?: string | null;
  organization_id: string | null;
  is_approved: boolean;
  uhid: string | null;
  ams_role?: "coach" | "athlete" | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  clientId: string | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  clientId: null,
  roles: [],
  loading: true,
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileAndClient = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    setProfile(profileData as any);

    if (profileData) {
      const p = profileData as any;
      let cId = null;

      if (p.uhid) {
        const { data: clientByUhid } = await supabase
          .from("clients")
          .select("id")
          .eq("uhid", p.uhid)
          .maybeSingle();
        cId = clientByUhid?.id;
      }

      if (!cId && p.email && p.organization_id) {
        const { data: clientByEmail } = await supabase
          .from("clients")
          .select("id")
          .eq("email", p.email)
          .eq("organization_id", p.organization_id)
          .maybeSingle();
        cId = clientByEmail?.id;
      }
      setClientId(cId ?? null);
    }
  };

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setRoles(data?.map((r) => r.role) || []);
  };

  useEffect(() => {
    // Single hydration path — onAuthStateChange fires INITIAL_SESSION on mount
    // with the persisted session, so we don't need a separate getSession() call.
    // Having both caused a race where loading was set to false before
    // profile/roles were fetched, flashing the user back to /login.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // setTimeout avoids Supabase internal deadlock on nested auth calls
          setTimeout(async () => {
            try {
              await fetchProfileAndClient(session.user.id);
              await fetchRoles(session.user.id);
            } finally {
              setLoading(false);
            }
          }, 0);
        } else {
          setProfile(null);
          setClientId(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setClientId(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, clientId, roles, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
