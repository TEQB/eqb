import { Resend } from "resend";
import { BrevoClient } from "@getbrevo/brevo";
import { logger } from "@/lib/logger";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "EQB <noreply@eqb.info>";

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getBrevoClient(): BrevoClient {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");
  return new BrevoClient({ apiKey });
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  bcc?: string[],
): Promise<void> {
  const { error } = await getResendClient().emails.send({
    from: FROM_EMAIL,
    to,
    bcc,
    subject,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  logger.info({ event: "email.sent.via_resend", message: "Email sent via Resend", metadata: { to, subject, bccCount: bcc?.length ?? 0 } });
}

async function sendViaBrevo(
  to: string,
  subject: string,
  html: string,
  bcc?: string[],
): Promise<void> {
  const client = getBrevoClient();
  const bccContacts = bcc?.map((email) => ({ email })) ?? [];

  const result = await client.transactionalEmails.sendTransacEmail({
    htmlContent: html,
    sender: { name: "EQB", email: "noreply@eqb.info" },
    subject,
    to: [{ email: to }],
    bcc: bccContacts.length > 0 ? bccContacts : undefined,
  });

  if (!result.messageId && !result.messageIds) {
    throw new Error(`Brevo error: no messageId in response`);
  }
  logger.info({ event: "email.sent.via_brevo", message: "Email sent via Brevo", metadata: { to, subject, bccCount: bcc?.length ?? 0 } });
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  bcc?: string[],
): Promise<void> {
  try {
    await sendViaResend(to, subject, html, bcc);
  } catch (resendErr) {
    const resendMsg = resendErr instanceof Error ? resendErr.message : String(resendErr);
    logger.warn({ event: "email.resend_failed", message: "Resend failed, trying Brevo", metadata: { to, subject, error: resendMsg } });

    try {
      await sendViaBrevo(to, subject, html, bcc);
    } catch (brevoErr) {
      const brevoMsg = brevoErr instanceof Error ? brevoErr.message : String(brevoErr);
      logger.error({ event: "email.all_providers_failed", message: "Both Resend and Brevo failed", metadata: { to, subject, resendError: resendMsg, brevoError: brevoMsg } });
      throw new Error(`Email delivery failed via both providers. Resend: ${resendMsg}. Brevo: ${brevoMsg}`);
    }
  }
}

export { FROM_EMAIL, sendViaResend, sendViaBrevo };