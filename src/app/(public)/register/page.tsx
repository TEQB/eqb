export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthShell } from "@/components/auth/AuthShell";

export default function RegisterPage() {
  return (
    <AuthShell
      page="register"
      headline="Join thousands of students studying smarter."
      subtext="Create your EQB account to access your programme's questions, upload resources, and study with your peers."
    >
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
          Create Account
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Join the community
        </h1>
        <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
          Sign up with your university email to get started.
        </p>
      </div>

      <div className="mt-6 rounded-2xl bg-primary/5 px-4 py-3 text-left text-sm text-primary">
        <span className="font-semibold">Step 1:</span> Your Details{" "}
        <span className="mx-2 text-gray-400">→</span>
        <span className="text-gray-500">Step 2:</span> Verify Email
      </div>

      <div className="mt-8">
        <RegisterForm />
      </div>

      <div className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#D4750A] hover:underline">
          Log in <ArrowRight className="inline-block h-4 w-4" />
        </Link>
      </div>
    </AuthShell>
  );
}
