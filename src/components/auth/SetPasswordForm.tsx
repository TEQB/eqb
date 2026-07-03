"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { getPasswordStrength, validatePassword } from "@/lib/validations";

const STRENGTH_STYLES = {
  weak: "bg-danger-500",
  medium: "bg-amber-500",
  strong: "bg-success-500",
} as const;

export function SetPasswordForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const matricNumber = searchParams.get("matric") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validation = validatePassword(password, { email, matricNumber });
    if (!validation.valid) {
      setError(validation.error);
      setShakeKey((k) => k + 1);
      toast.warning(validation.error);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      setShakeKey((k) => k + 1);
      toast.warning("Passwords don't match");
      return;
    }

    setIsSubmitting(true);

    const res = await fetch("/api/auth/create-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const { error: createErr } = await res.json();
      setError(createErr || "Failed to create account");
      toast.error(createErr || "Failed to create account");
      setIsSubmitting(false);
      return;
    }

    toast.success("Account created! Check your email to confirm your address, then sign in.");
    const params = new URLSearchParams({ confirmed: email });
    window.location.href = `/login?${params}`;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" key={shakeKey}>
      <p className="animate-fade-in-up text-sm text-gray-500">
        Set a password for your account. You&apos;ll use this along with your email to log in next time.
      </p>

      <div className="animate-fade-in-up stagger-1">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5"
          autoComplete="new-password"
        />
        {password.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-200">
              <div
                className={cn(
                  "transition-all duration-300",
                  STRENGTH_STYLES[strength],
                  strength === "weak" && "w-1/3",
                  strength === "medium" && "w-2/3",
                  strength === "strong" && "w-full",
                )}
              />
            </div>
            <p className="text-xs text-gray-500 capitalize">Strength: {strength}</p>
          </div>
        )}
      </div>

      <div className="animate-fade-in-up stagger-2">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 block w-full rounded-xl border border-gray-300 px-3.5 py-2.5"
          autoComplete="new-password"
        />
      </div>

      {error && (
        <p className={cn("text-sm text-danger-600 animate-fade-in", shakeKey > 0 && "animate-shake")}>
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-2xl"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <svg className="h-4 w-4 animate-spinner" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating account...
          </span>
        ) : "Create account & sign in"}
      </Button>
    </form>
  );
}
