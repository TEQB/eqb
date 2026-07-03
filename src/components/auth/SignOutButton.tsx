"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface SignOutButtonProps {
  redirectTo?: string;
  className?: string;
  children: React.ReactNode;
}

export function SignOutButton({ redirectTo = "/login", className, children }: SignOutButtonProps) {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <button type="button" onClick={() => void handleSignOut()} className={className}>
      {children}
    </button>
  );
}
