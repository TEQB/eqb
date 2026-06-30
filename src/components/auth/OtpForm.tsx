"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(600);
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    const token = otp.join("");
    if (token.length !== 6) return;
    setIsVerifying(true);
    setError("");

    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: token }),
    });

    if (!res.ok) {
      const { error: verifyErr } = await res.json();
      setError(verifyErr || "Invalid code");
      setShakeKey((k) => k + 1);
      toast.error(verifyErr || "Invalid code");
      setIsVerifying(false);
      return;
    }

    toast.success("Code verified — finalizing your account...");
    const result = await res.json();

    if (result.hasPendingRegistration) {
      const params = new URLSearchParams({ email });
      router.push(`/register/set-password?${params}`);
    } else {
      router.push(`/login?verified=${encodeURIComponent(email)}`);
    }
  }, [otp, email, router]);

  useEffect(() => {
    if (otp.every((d) => d !== "")) {
      handleVerify();
    }
  }, [otp, handleVerify]);

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setTimeLeft(600);
    setOtp(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();

    await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    toast.success("New code sent");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4 animate-fade-in-up" key={shakeKey}>
      <div className="flex justify-center gap-2">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="h-12 w-12 rounded-2xl border border-white/70 text-center text-lg font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] transition-all duration-normal focus:border-secondary focus:shadow-[0_0_0_4px_rgba(212,117,10,0.16)] focus:outline-none"
            style={digit ? { borderColor: "var(--secondary)", boxShadow: "0 0 0 4px rgba(212,117,10,0.16)" } : undefined}
          />
        ))}
      </div>

      <p className="text-center text-sm text-gray-500">
        {timeLeft > 0 ? (
          <>Code expires in <span className="font-medium text-gray-700">{formatTime(timeLeft)}</span></>
        ) : (
          "Code expired"
        )}
      </p>

      {error && <p className="text-center text-sm text-danger-600 animate-fade-in">{error}</p>}

      {isVerifying && (
        <p className="inline-flex items-center justify-center gap-2 text-center text-sm text-gray-500">
          <svg className="h-4 w-4 animate-spinner" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Verifying...
        </p>
      )}

      {canResend && (
        <Button
          onClick={handleResend}
          variant="link"
          className="text-sm font-medium"
        >
          Resend OTP
        </Button>
      )}
    </div>
  );
}
