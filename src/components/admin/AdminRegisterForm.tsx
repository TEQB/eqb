"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toaster";

export function AdminRegisterForm({ secret }: { secret: string }) {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const sendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setMessage("OTP sent to " + email);
      toast.success("OTP sent to " + email);
      setStep(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
      toast.error(e instanceof Error ? e.message : "Failed to send OTP");
    }
    setLoading(false);
  };

  const verifyOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setMessage("Email verified");
      toast.success("Email verified");
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
      toast.error(e instanceof Error ? e.message : "Verification failed");
    }
    setLoading(false);
  };

  const createAccount = async () => {
    setError("");
    const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!PASSWORD_REGEX.test(password)) {
      setError("Password must be at least 8 characters with uppercase, lowercase, number, and special character");
      toast.warning("Password must be at least 8 characters with uppercase, lowercase, number, and special character");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      toast.warning("Passwords do not match");
      return;
    }
    if (!fullName.trim()) {
      setError("Full name is required");
      toast.warning("Full name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/create-admin-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account");
      setMessage("Admin account created! Redirecting to login...");
      toast.success("Admin account created");
      setStep(3);
      setTimeout(() => {
        window.location.href = `/admin/${secret}/login`;
      }, 1500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Account creation failed");
      toast.error(e instanceof Error ? e.message : "Account creation failed");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-center text-xl font-semibold text-gray-900">
          Admin Setup
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          {step === 0 && "Verify your email to create the admin account"}
          {step === 1 && "Enter the code sent to your email"}
          {step === 2 && "Set your admin credentials"}
          {step === 3 && "Account created"}
        </p>

        <div className="space-y-4">
          {step === 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <button
                type="button"
                onClick={sendOtp}
                disabled={loading}
                className="w-full rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  OTP Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-center text-lg tracking-widest focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <button
                type="button"
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Back
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ifeoluwa Bankole"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters with uppercase, lowercase, number & special char"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-600 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <button
                type="button"
                onClick={createAccount}
                disabled={loading}
                className="w-full rounded-md bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Admin Account"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Back
              </button>
            </>
          )}

          {message && !error && (
            <p className="text-center text-sm text-green-600">{message}</p>
          )}
          {error && (
            <p className="text-center text-sm text-danger-600">{error}</p>
          )}

          {step === 3 && (
            <p className="text-center text-sm text-gray-500">
              Redirecting to{" "}
              <a
                href={`/admin/${secret}/login`}
                className="text-primary-600 hover:underline"
              >
                login page
              </a>
              ...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
