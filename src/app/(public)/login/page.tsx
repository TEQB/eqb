export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthShell } from "@/components/auth/AuthShell";

export default function LoginPage() {
  return (
    <AuthShell
      page="login"
      headline="Welcome back. Your notes missed you."
      subtext="Log in to continue browsing, saving, and contributing to your programme's question bank on EQB."
    >
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
          Log In
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Welcome back
        </h1>
        <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
          Enter your university email and password to pick up where you left off.
        </p>
      </div>

      <div className="mt-8">
        <LoginForm />
      </div>

      <div className="my-8 flex items-center gap-4 text-sm text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        <span>or</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>

      <div className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-[#D4750A] hover:underline">
          Create one <ArrowRight className="inline-block h-4 w-4" />
        </Link>
      </div>
    </AuthShell>
  );
}
