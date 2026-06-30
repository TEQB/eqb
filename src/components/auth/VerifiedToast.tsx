"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/components/ui/toaster";

function VerifiedToastInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("verified");
  useEffect(() => {
    if (email) {
      toast.success(
        `Email verified — sign in as ${decodeURIComponent(email)}`,
      );
    }
  }, [email]);
  return null;
}

export function VerifiedToast() {
  return (
    <Suspense fallback={null}>
      <VerifiedToastInner />
    </Suspense>
  );
}
