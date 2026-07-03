"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { markVoluntaryLogout } from "@/lib/auth-session";

interface SignOutButtonProps {
  redirectTo?: string;
  className?: string;
  children: React.ReactNode;
}

export function SignOutButton({ redirectTo = "/login", className, children }: SignOutButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    markVoluntaryLogout();
    await supabase.auth.signOut();
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <button type="button" onClick={() => void handleSignOut()} className={className}>
      {children}
    </button>
  );
}
