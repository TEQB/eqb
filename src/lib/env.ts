const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GEMINI_API_KEY",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "NEXT_PUBLIC_UNIVERSITY_EMAIL_DOMAIN",
  "ADMIN_SECRET_PATH",
] as const;

const RECOMMENDED = [
  "RESEND_FROM_EMAIL",
  "ADMIN_INITIAL_EMAIL",
  "BREVO_API_KEY",
] as const;

export function validateEnv(): string[] {
  const missing: string[] = [];
  for (const key of REQUIRED) {
    if (!process.env[key]) missing.push(key);
  }
  return missing;
}

export function validateRecommended(): string[] {
  const missing: string[] = [];
  for (const key of RECOMMENDED) {
    if (!process.env[key]) missing.push(key);
  }
  return missing;
}

export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}
