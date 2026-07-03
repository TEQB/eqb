import { z } from "zod";

/** Shared server + client password rules — keep in sync everywhere passwords are validated. */
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

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  matricNumber: z.string().min(6).max(20),
  facultyId: z.string().uuid(),
  programmeId: z.string().uuid(),
  currentLevel: z.preprocess(
    (v) => (v ? Number(v) : v),
    z.number().int().min(100).max(600),
  ),
});

export const setPasswordSchema = z
  .object({
    email: z.string().email().optional(),
    matricNumber: z.string().optional(),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    const result = validatePassword(data.password, {
      email: data.email,
      matricNumber: data.matricNumber,
    });
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error, path: ["password"] });
    }
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const uploadSchema = z.object({
  courseId: z.string().uuid(),
  year: z.preprocess(
    (v) => (v ? Number(v) : v),
    z.number().int().min(1990).max(new Date().getFullYear()),
  ),
  semester: z.enum(["first", "second"]),
  examType: z.enum(["mid_semester", "examination"]).default("examination"),
});

export const solutionSchema = z.object({
  body: z.string().min(1, "Solution text is required").optional().or(z.literal("")),
});

export const sendOtpSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(100).optional(),
  matricNumber: z.string().min(6).max(20).optional(),
  programmeId: z.string().uuid().optional(),
  currentLevel: z.preprocess(
    (v) => (v ? Number(v) : v),
    z.number().int().min(100).max(600).optional(),
  ),
});

export const moderateSchema = z.object({
  questionId: z.string().uuid(),
  courseCode: z.string().min(1).max(20),
  courseName: z.string().min(1).max(200),
});
