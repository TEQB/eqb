import { z } from "zod";
import { validatePassword } from "@/lib/password";

export {
  PASSWORD_REGEX,
  validatePassword,
  getPasswordStrength,
  type PasswordStrength,
  type PasswordValidationContext,
} from "@/lib/password";

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

export const verifyResetOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const completePasswordResetSchema = z
  .object({
    email: z.string().email(),
    token: z.string().min(1, "Verification token is required"),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1),
  })
  .superRefine((data, ctx) => {
    const result = validatePassword(data.password, { email: data.email });
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error, path: ["password"] });
    }
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
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
