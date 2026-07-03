/** Shared server + client password rules — import from here in client components. */

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const COMMON_PASSWORD_BLOCKLIST = new Set(
  [
    "password",
    "password1",
    "password12",
    "password123",
    "Password1",
    "Password1!",
    "Password12!",
    "Password123!",
    "Qwerty123!",
    "Welcome1!",
    "Admin123!",
    "Letmein1!",
    "Changeme1!",
    "University1!",
  ].map((p) => p.toLowerCase()),
);

export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordValidationContext {
  email?: string;
  matricNumber?: string;
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password || password.length < 8 || !PASSWORD_REGEX.test(password)) {
    return "weak";
  }
  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score >= 4) return "strong";
  if (score >= 2) return "medium";
  return "weak";
}

export function validatePassword(
  password: string,
  context: PasswordValidationContext = {},
): { valid: true } | { valid: false; error: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return {
      valid: false,
      error:
        "Password must include uppercase, lowercase, a number, and a special character",
    };
  }
  if (COMMON_PASSWORD_BLOCKLIST.has(password.toLowerCase())) {
    return { valid: false, error: "This password is too common. Choose a stronger one." };
  }
  const emailLocal = context.email?.split("@")[0]?.toLowerCase();
  if (emailLocal && emailLocal.length >= 3 && password.toLowerCase().includes(emailLocal)) {
    return { valid: false, error: "Password must not contain your email address" };
  }
  const matric = context.matricNumber?.trim().toUpperCase();
  if (matric && matric.length >= 4 && password.toUpperCase().includes(matric)) {
    return { valid: false, error: "Password must not contain your matric number" };
  }
  return { valid: true };
}
