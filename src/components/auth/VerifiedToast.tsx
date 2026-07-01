"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toaster";

function VerifiedToastInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("verified");
  const confirmedEmail = searchParams.get("confirmed");
  useEffect(() => {
    if (email) {
      toast.success(
        `Email verified — sign in as ${decodeURIComponent(email)}`,
      );
    }
  }, [email]);
  useEffect(() => {
    if (confirmedEmail) {
      toast.success(
        `Account created! Check your email to confirm your address, then sign in.`,
      );
    }
  }, [confirmedEmail]);
  return null;
}

export function VerifiedToast() {
  return (
    <Suspense fallback={null}>
      <VerifiedToastInner />
    </Suspense>
  );
}
