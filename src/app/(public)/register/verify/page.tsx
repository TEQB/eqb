export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { OtpForm } from "@/components/auth/OtpForm";

function VerifyContent() {
  return <OtpForm />;
}

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Verify your email
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter the 6-digit code sent to your university email.
        </p>
        <div className="mt-6">
          <Suspense fallback={<div className="h-12" />}>
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
