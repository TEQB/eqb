"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toaster";
import {
  consumeVoluntaryLogoutFlag,
  getLoginRedirectPath,
} from "@/lib/auth-session";

function isNetworkError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg =
    typeof (err as Record<string, unknown>).message === "string"
      ? ((err as Record<string, unknown>).message as string).toLowerCase()
      : "";
  return (
    msg.includes("fetch") ||
    msg.includes("network") ||
    msg.includes("cors") ||
    msg.includes("typeerror") ||
    (err as Record<string, unknown>).status === undefined
  );
}

export function SessionManager() {
  const router = useRouter();
  const supabase = createClient();
  const wasAuthenticatedRef = useRef(false);
  const toastShownRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleExpiredSession = () => {
      if (toastShownRef.current) return;
      toastShownRef.current = true;
      toast.error("Session expired — please log in again", { duration: 8000 });
      router.push(getLoginRedirectPath());
    };

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        wasAuthenticatedRef.current = true;
        const { error } = await supabase.auth.getUser();
        if (!error) { scheduleNext(); return; }
        if (isNetworkError(error)) { scheduleNext(); return; }
        wasAuthenticatedRef.current = false;
        await supabase.auth.signOut();
        handleExpiredSession();
        scheduleNext();
        return;
      }

      if (wasAuthenticatedRef.current) {
        const { error } = await supabase.auth.getUser();
        if (!error) {
          wasAuthenticatedRef.current = true;
          scheduleNext();
          return;
        }
        if (isNetworkError(error)) { scheduleNext(); return; }
      }

      wasAuthenticatedRef.current = false;
      scheduleNext();
    };

    const scheduleNext = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(checkSession, 60_000);
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
          supabase.auth.getUser().then(({ error }) => {
            if (!error) return;
            if (isNetworkError(error)) return;
            wasAuthenticatedRef.current = false;
            handleExpiredSession();
          });
        }
      }
    });

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        wasAuthenticatedRef.current = true;
      }
    });

    checkSession();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (timerRef.current) clearTimeout(timerRef.current);
        checkSession();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, supabase]);

  return null;
}
