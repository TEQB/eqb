import { Resend } from "resend";
import { BrevoClient } from "@getbrevo/brevo";
import Mailjet from "node-mailjet";
import { logger } from "@/lib/logger";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "EQB <noreply@eqb.info>";

function parseFromString(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2] };
  return { name: from.split("@")[0], email: from };
}

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

let mailjetClient: Mailjet | null = null;

function getMailjetClient(): Mailjet {
  if (!mailjetClient) {
    const apiKey = process.env.MAILJET_API_KEY;
    const secretKey = process.env.MAILJET_SECRET_KEY;
    if (!apiKey || !secretKey) {
      throw new Error("MAILJET_API_KEY or MAILJET_SECRET_KEY is not set");
    }
    mailjetClient = Mailjet.apiConnect(apiKey, secretKey);
  }
  return mailjetClient;
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text?: string,
  bcc?: string[],
  from?: string,
): Promise<void> {
  const { error } = await getResendClient().emails.send({
    from: from ?? FROM_EMAIL,
    to,
    bcc,
    subject,
    html,
    text,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  logger.info({ event: "email.sent.via_resend", message: "Email sent via Resend", metadata: { to, subject, bccCount: bcc?.length ?? 0 } });
}

async function sendViaBrevo(
  to: string,
  subject: string,
  html: string,
  text?: string,
  bcc?: string[],
  from?: string,
): Promise<void> {
  const client = getBrevoClient();
  const bccContacts = bcc?.map((email) => ({ email })) ?? [];
  const parsedFrom = from ? parseFromString(from) : { name: "EQB", email: "noreply@eqb.info" };

  const result = await client.transactionalEmails.sendTransacEmail({
    htmlContent: html,
    textContent: text,
    sender: parsedFrom,
    subject,
    to: [{ email: to }],
    bcc: bccContacts.length > 0 ? bccContacts : undefined,
  });

  if (!result.messageId && !result.messageIds) {
    throw new Error(`Brevo error: no messageId in response`);
  }
  logger.info({ event: "email.sent.via_brevo", message: "Email sent via Brevo", metadata: { to, subject, bccCount: bcc?.length ?? 0 } });
}

async function sendViaMailjet(
  to: string,
  subject: string,
  html: string,
  text?: string,
  bcc?: string[],
  from?: string,
): Promise<void> {
  const client = getMailjetClient();
  const bccRecipients = bcc?.map((email) => ({ Email: email })) ?? [];
  const parsedFrom = from ? parseFromString(from) : { name: "EQB", email: "noreply@eqb.info" };

  const result = await client
    .post("send", { version: "v3.1" })
    .request({
      Messages: [
        {
          From: { Email: parsedFrom.email, Name: parsedFrom.name },
          To: [{ Email: to }],
          Bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
          Subject: subject,
          HTMLPart: html,
          TextPart: text,
        },
      ],
    });

  const body = result.body as {
    Messages?: Array<{ Status: string; Errors?: Array<{ ErrorMessage: string }> }>;
  };
  const messageResult = body.Messages?.[0];

  if (!messageResult || messageResult.Status !== "success") {
    const errorDetail = messageResult?.Errors?.[0]?.ErrorMessage || "Unknown Mailjet error";
    throw new Error(`Mailjet error: ${errorDetail}`);
  }

  logger.info({ event: "email.sent.via_mailjet", message: "Email sent via Mailjet", metadata: { to, subject, bccCount: bcc?.length ?? 0 } });
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  bcc?: string[],
  from?: string,
  text?: string,
): Promise<void> {
  const plainText = text ?? stripHtml(html);
  try {
    await sendViaResend(to, subject, html, plainText, bcc, from);
  } catch (resendErr) {
    const resendMsg = resendErr instanceof Error ? resendErr.message : String(resendErr);
    logger.warn({ event: "email.resend_failed", message: "Resend failed, trying Brevo", metadata: { to, subject, error: resendMsg } });

    try {
      await sendViaBrevo(to, subject, html, plainText, bcc, from);
    } catch (brevoErr) {
      const brevoMsg = brevoErr instanceof Error ? brevoErr.message : String(brevoErr);
      logger.warn({ event: "email.brevo_failed", message: "Brevo failed, trying Mailjet", metadata: { to, subject, error: brevoMsg } });

      try {
        await sendViaMailjet(to, subject, html, plainText, bcc, from);
      } catch (mailjetErr) {
        const mailjetMsg = mailjetErr instanceof Error ? mailjetErr.message : String(mailjetErr);
        logger.error({
          event: "email.all_providers_failed",
          message: "Resend, Brevo, and Mailjet all failed",
          metadata: { to, subject, resendError: resendMsg, brevoError: brevoMsg, mailjetError: mailjetMsg },
        });
        throw new Error(
          `Email delivery failed via all three providers. Resend: ${resendMsg}. Brevo: ${brevoMsg}. Mailjet: ${mailjetMsg}`,
        );
      }
    }
  }
}

export { FROM_EMAIL, stripHtml, sendViaResend, sendViaBrevo, sendViaMailjet };
