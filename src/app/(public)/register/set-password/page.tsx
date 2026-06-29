export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

function SetPasswordContent() {
  return <SetPasswordForm />;
}

export default function SetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900">
          Set your password
        </h1>
        <div className="mt-4">
          <Suspense fallback={<div className="h-12" />}>
            <SetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
