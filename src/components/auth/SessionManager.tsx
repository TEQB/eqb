"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { toast } from "@/components/ui/toaster";
import {
  consumeVoluntaryLogoutFlag,
  getLoginRedirectPath,
} from "@/lib/auth-session";

export function SessionManager() {
  const router = useRouter();
  const { user, loading, supabase } = useAuth();
  const toastShownRef = useRef(false);
  const wasAuthedRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      wasAuthedRef.current = true;
      toastShownRef.current = false;
      return;
    }
    if (!user && wasAuthedRef.current) {
      if (consumeVoluntaryLogoutFlag()) {
        wasAuthedRef.current = false;
        return;
      }
      if (!toastShownRef.current) {
        toastShownRef.current = true;
        toast.error("Session expired \u2014 please log in again", { duration: 8000 });
        router.push(getLoginRedirectPath());
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.getUser();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [supabase]);

  return null;
}
