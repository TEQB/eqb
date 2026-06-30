import { Resend } from "resend";

const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "EQB <noreply@eqb.info>";

let client: Resend | null = null;

export function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set");
    }
    client = new Resend(apiKey);
  }
  return client;
}

export { RESEND_FROM_EMAIL };