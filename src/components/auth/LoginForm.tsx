"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loginSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

type FormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const supabase = createClient();
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot-password" | "reset-sent">("login");
  const [resetEmail, setResetEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (signInError) {
      setError(signInError.message);
      setShakeKey((k) => k + 1);
      toast.error(signInError.message);
      return;
    }

    toast.success("Logged in. Taking you to your dashboard...");
    window.location.href = "/dashboard";
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setResetEmail(resetEmail.trim());
    if (!resetEmail.trim()) {
      setError("Enter your university email");
      toast.warning("Enter your university email");
      return;
    }

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: resetEmail.trim(),
        role: "student",
        redirectTo: `${window.location.origin}/login`,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to send reset email");
      toast.error(data.error || "Failed to send reset email");
      return;
    }

    setMode("reset-sent");
    toast.success("Reset email sent — check your inbox");
  };

  if (mode === "forgot-password" || mode === "reset-sent") {
    return (
      <div className="space-y-4">
        {mode === "forgot-password" ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="w-full">
              <label htmlFor="resetEmail" className="mb-2 block text-sm font-semibold text-gray-700">
                University email
              </label>
              <input
                id="resetEmail"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                placeholder="you@university.edu.ng"
                className="block h-12 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-base focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            {error && (
              <p className="text-sm text-danger-600 animate-fade-in">{error}</p>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
            >
              Send reset link
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">
            If an account exists for that email, a reset link has been sent.
          </div>
        )}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" key={shakeKey}>
      <div className="w-full animate-fade-in-up stagger-1">
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-gray-700">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@university.edu.ng"
          className="h-12 rounded-xl focus-visible:ring-[#7A1030]"
          {...register("email")}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-danger-600 animate-fade-in">{errors.email.message}</p>
        )}
      </div>

      <div className="w-full animate-fade-in-up stagger-2">
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-gray-700">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
            className="h-12 rounded-xl pr-12 focus-visible:ring-[#7A1030]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 transition-colors hover:text-secondary"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-danger-600 animate-fade-in">{errors.password.message}</p>
        )}
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() => {
              setMode("forgot-password");
              setResetEmail("");
              setError("");
            }}
            className="text-xs font-medium text-[#D4750A] hover:underline"
          >
            Forgot password?
          </button>
        </div>
      </div>

      {error && (
        <p className={cn("text-sm text-danger-600 animate-fade-in", shakeKey > 0 && "animate-shake")}>
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl py-5 text-md font-semibold"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spinner" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Logging in...
          </span>
        ) : "Log In"}
      </Button>
    </form>
  );
}
