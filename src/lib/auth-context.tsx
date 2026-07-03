"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { markVoluntaryLogout, consumeVoluntaryLogoutFlag } from "@/lib/auth-session";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  supabase: SupabaseClient;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const supabaseRef = useRef<SupabaseClient | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case "INITIAL_SESSION":
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          break;
        case "SIGNED_IN":
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
          break;
        case "TOKEN_REFRESHED":
        case "USER_UPDATED":
          setSession(session);
          setUser(session?.user ?? null);
          break;
        case "SIGNED_OUT":
          if (consumeVoluntaryLogoutFlag()) {
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
          setSession(null);
          setUser(null);
          setLoading(false);
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    markVoluntaryLogout();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, supabase, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
