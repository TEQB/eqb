"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";

const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

export function SessionManager() {
  const router = useRouter();
  const supabase = createClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastShownRef = useRef(false);

  const handleSessionExpired = () => {
    if (toastShownRef.current) return;
    toastShownRef.current = true;

    toast.error("Session expired", {
      description: "Logged out due to inactivity. Please log in again.",
      duration: 8000,
    });

    void supabase.auth.signOut().then(() => {
      router.push("/login");
    });
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === "AUTH_SESSION_MISSING") {
        handleSessionExpired();
      }
    });

    const checkSession = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        handleSessionExpired();
      }
    };

    intervalRef.current = setInterval(() => {
      void checkSession();
    }, SESSION_CHECK_INTERVAL_MS);

    void checkSession();

    return () => {
      subscription.unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [router, supabase]);

  return null;
}