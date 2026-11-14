// Tests the email provider chain (Resend -> Brevo -> Mailjet) using the same
// SDK calls as src/lib/mailer.ts. Real emails are sent for each provider.
//
// Usage:
//   node --env-file=.env.local scripts/test-email-providers.mjs <to-email>
//   node --env-file=.env.local scripts/test-email-providers.mjs <to-email> chain   # fallback chain (default)
//   node --env-file=.env.local scripts/test-email-providers.mjs <to-email> all     # each provider individually
//   node --env-file=.env.local scripts/test-email-providers.mjs <to-email> resend  # one provider only

import { Resend } from "resend";
import { BrevoClient } from "@getbrevo/brevo";
import Mailjet from "node-mailjet";

const to = process.argv[2];
const mode = process.argv[3] || "chain";

if (!to || !/^\S+@\S+\.\S+$/.test(to)) {
  console.error("Usage: node --env-file=.env.local scripts/test-email-providers.mjs <to-email> [chain|all|resend|brevo|mailjet]");
  process.exit(1);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "EQB <noreply@eqb.info>";
const SUBJECT = "EQB Email Provider Test";
const HTML = `<p>This is a test email from EQB verifying provider delivery to <strong>${to}</strong>.</p>`;
const TEXT = `This is a test email from EQB verifying provider delivery to ${to}.`;

function parseFromString(from) {
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) return { name: match[1].trim(), email: match[2] };
  return { name: from.split("@")[0], email: from };
}

async function sendViaResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: FROM_EMAIL, to, subject: SUBJECT, html: HTML, text: TEXT,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
}

async function sendViaBrevo() {
  if (!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY is not set");
  const parsedFrom = parseFromString(FROM_EMAIL);
  const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  const result = await client.transactionalEmails.sendTransacEmail({
    htmlContent: HTML, textContent: TEXT, sender: parsedFrom,
    subject: SUBJECT, to: [{ email: to }],
  });
  if (!result.messageId && !result.messageIds) throw new Error("Brevo error: no messageId in response");
}

async function sendViaMailjet() {
  if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY)
    throw new Error("MAILJET_API_KEY or MAILJET_SECRET_KEY is not set");
  const client = Mailjet.apiConnect(process.env.MAILJET_API_KEY, process.env.MAILJET_SECRET_KEY);
  const parsedFrom = parseFromString(FROM_EMAIL);
  const result = await client.post("send", { version: "v3.1" }).request({
    Messages: [{
      From: { Email: parsedFrom.email, Name: parsedFrom.name },
      To: [{ Email: to }],
      Subject: SUBJECT, HTMLPart: HTML, TextPart: TEXT,
    }],
  });
  const msg = result.body?.Messages?.[0];
  if (!msg || msg.Status !== "success")
    throw new Error(`Mailjet error: ${msg?.Errors?.[0]?.ErrorMessage || "unknown"}`);
}

const providers = { resend: sendViaResend, brevo: sendViaBrevo, mailjet: sendViaMailjet };

async function report(name, fn) {
  const start = Date.now();
  try {
    await fn();
    console.log(`  [OK]      ${name} — delivered (${Date.now() - start}ms)`);
    return true;
  } catch (err) {
    console.log(`  [FAILED]  ${name} — ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

if (mode === "all") {
  console.log(`Testing each provider individually -> ${to}\n`);
  for (const [name, fn] of Object.entries(providers)) await report(name, fn);
} else if (mode === "chain") {
  console.log(`Testing fallback chain (Resend -> Brevo -> Mailjet) -> ${to}\n`);
  let delivered = false;
  for (const [name, fn] of Object.entries(providers)) {
    const start = Date.now();
    try {
      await fn();
      console.log(`  [OK]      ${name} — delivered (${Date.now() - start}ms) — chain stopped here`);
      delivered = true;
      break;
    } catch (err) {
      console.log(`  [FAILED]  ${name} — ${err instanceof Error ? err.message : err} — trying next provider`);
    }
  }
  if (!delivered) console.log("\nAll providers failed — email was NOT delivered.");
} else {
  if (!providers[mode]) {
    console.error(`Unknown provider "${mode}". Use chain, all, resend, brevo, or mailjet.`);
    process.exit(1);
  }
  console.log(`Testing ${mode} -> ${to}\n`);
  await report(mode, providers[mode]);
}
