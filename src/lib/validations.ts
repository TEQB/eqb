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
  matricNumber: z.string().regex(/^125\/\d{2}\/[12]\/\d{4}$/, "Format: 125/XX/Y/ZZZZ (e.g. 125/23/1/0056)"),
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
  matricNumber: z.string().regex(/^125\/\d{2}\/[12]\/\d{4}$/, "Format: 125/XX/Y/ZZZZ").optional(),
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

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const testEmailSchema = z.object({
  email: z.string().email(),
});

export const broadcastSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
  html_body: z.string().min(1, "Message body is required").max(50000, "Message too long"),
  faculty_id: z.string().uuid().optional().nullable(),
  programme_id: z.string().uuid().optional().nullable(),
  level: z.preprocess(
    (v) => (v ? Number(v) : undefined),
    z.number().int().min(100).max(600).optional(),
  ),
  student_ids: z.array(z.string().uuid()).optional(),
});

export const feedbackSchema = z.object({
  message: z.string().min(10).max(2000),
});

export const uuidParamSchema = z.string().uuid();

export const adminActionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  code: z.string().min(1).max(20).optional(),
  title: z.string().min(1).max(200).optional(),
  level: z.preprocess(
    (v) => (v ? Number(v) : v),
    z.number().int().min(100).max(600).optional(),
  ),
  email: z.string().email().optional(),
  facultyId: z.string().uuid().optional(),
  programmeId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  questionId: z.string().uuid().optional(),
  solutionId: z.string().uuid().optional(),
});
