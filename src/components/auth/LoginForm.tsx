"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { loginSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

type FormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot-password" | "reset-code" | "reset-password" | "reset-success">("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");

    const res = await fetch("/api/auth/student-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        body.code === "no_account"
          ? "No account found for this email."
          : body.error || "Invalid email or password.";
      setError(message);
      setShakeKey((k) => k + 1);
      toast.error(message);
      return;
    }

    toast.success("Logged in. Taking you to your dashboard...");
    window.location.href = "/dashboard";
  };

  const handleSendOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const email = resetEmail.trim();
    if (!email) {
      setError("Enter your university email");
      toast.warning("Enter your university email");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: "student" }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to send reset code");
      toast.error(data.error || "Failed to send reset code");
      return;
    }

    setMode("reset-code");
    toast.success("Reset code sent — check your inbox");
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!code.trim() || code.trim().length !== 6) {
      setError("Enter the 6-digit code from your email");
      toast.warning("Enter the 6-digit code from your email");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/verify-reset-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: resetEmail.trim(), code: code.trim() }),
    });
    setSubmitting(false);

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body.error || "Invalid or expired code");
      toast.error(body.error || "Invalid or expired code");
      return;
    }

    setResetToken(body.token);
    setMode("reset-password");
    toast.success("Code verified — enter your new password");
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      toast.warning("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords don't match");
      toast.warning("Passwords don't match");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/auth/complete-password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: resetEmail.trim(),
        token: resetToken,
        password: newPassword,
        confirmPassword: confirmNewPassword,
      }),
    });
    setSubmitting(false);

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body.error || "Failed to reset password");
      toast.error(body.error || "Failed to reset password");
      return;
    }

    setMode("reset-success");
    toast.success("Password reset successfully");
  };

  if (mode === "forgot-password") {
    return (
      <div className="space-y-4">
        <form onSubmit={handleSendOtp} className="space-y-4">
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
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-5 text-md font-semibold"
          >
            {submitting ? "Sending..." : "Send reset code"}
          </Button>
        </form>
        <div className="text-center">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); }}
            className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (mode === "reset-code") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 text-center">
          Enter the 6-digit code sent to <strong>{resetEmail}</strong>
        </p>
        <form onSubmit={handleVerifyCode} className="space-y-4">
          <div className="w-full">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              required
              placeholder="000000"
              className="block h-12 w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-center text-2xl tracking-[0.5em] focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-danger-600 animate-fade-in">{error}</p>
          )}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-5 text-md font-semibold"
          >
            {submitting ? "Verifying..." : "Verify code"}
          </Button>
        </form>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setMode("forgot-password"); setError(""); setCode(""); }}
            className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            Change email
          </button>
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); setCode(""); }}
            className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (mode === "reset-password") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600 text-center">
          Set a new password for <strong>{resetEmail}</strong>
        </p>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="w-full">
            <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-gray-700">
              New password
            </label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 rounded-xl pr-12 focus-visible:ring-[#7A1030]"
                placeholder="At least 8 characters"
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
          </div>
          <div className="w-full">
            <label htmlFor="confirmNewPassword" className="mb-2 block text-sm font-semibold text-gray-700">
              Confirm password
            </label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="h-12 rounded-xl focus-visible:ring-[#7A1030]"
              placeholder="Repeat your password"
            />
          </div>
          {error && (
            <p className="text-sm text-danger-600 animate-fade-in">{error}</p>
          )}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl py-5 text-md font-semibold"
          >
            {submitting ? "Resetting..." : "Reset password"}
          </Button>
        </form>
        <div className="text-center">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(""); setNewPassword(""); setConfirmNewPassword(""); }}
            className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (mode === "reset-success") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-success-200 bg-success-50 p-4 text-sm text-success-700">
          Your password has been reset successfully.
        </div>
        <Button
          onClick={() => { setMode("login"); setError(""); setNewPassword(""); setConfirmNewPassword(""); }}
          className="w-full rounded-xl py-5 text-md font-semibold"
        >
          Sign in with new password
        </Button>
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
