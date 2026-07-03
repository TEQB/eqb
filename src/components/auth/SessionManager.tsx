"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import {
  consumeVoluntaryLogoutFlag,
  getLoginRedirectPath,
} from "@/lib/auth-session";

export function SessionManager() {
  const router = useRouter();
  const supabase = createClient();
  const wasAuthenticatedRef = useRef(false);
  const toastShownRef = useRef(false);

  useEffect(() => {
    const handleExpiredSession = () => {
      if (toastShownRef.current) return;
      toastShownRef.current = true;

      toast.error("Session expired — please log in again", { duration: 8000 });
      router.push(getLoginRedirectPath());
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        wasAuthenticatedRef.current = true;
        toastShownRef.current = false;
        return;
      }

      if (event === "SIGNED_OUT") {
        if (consumeVoluntaryLogoutFlag()) {
          wasAuthenticatedRef.current = false;
          return;
        }
        if (wasAuthenticatedRef.current) {
          wasAuthenticatedRef.current = false;
          handleExpiredSession();
        }
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        wasAuthenticatedRef.current = true;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return null;
}
