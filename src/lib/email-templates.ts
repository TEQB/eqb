const BRAND = {
  crimson: "#7A1030",
  gold: "#D4A017",
  cream: "#FAF7F4",
  darkText: "#1a1a1a",
  mutedText: "#666666",
};

function baseTemplate(content: string, footer?: string): string {
  return [
    "<!DOCTYPE html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"UTF-8\" />",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />",
    "  <title>EQB</title>",
    "</head>",
    "<body style=\"margin:0;padding:0;background-color:" + BRAND.cream + ";font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;\">",
    "  <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"background-color:" + BRAND.cream + ";padding:40px 16px;\">",
    "    <tr>",
    "      <td align=\"center\">",
    "        <table width=\"100%\" style=\"max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);\">",
    "          <tr>",
    "            <td style=\"background-color:" + BRAND.crimson + ";padding:28px 32px;text-align:center;\">",
    "              <h1 style=\"margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;\">EQB</h1>",
    "              <p style=\"margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;\">Past Questions Platform</p>",
    "            </td>",
    "          </tr>",
    "          <tr>",
    "            <td style=\"background-color:" + BRAND.gold + ";height:4px;\"></td>",
    "          </tr>",
    "          <tr>",
    "            <td style=\"padding:36px 32px 32px;\">",
    "              " + content,
    "            </td>",
    "          </tr>",
    "          <tr>",
    "            <td style=\"background-color:" + BRAND.cream + ";padding:20px 32px;text-align:center;border-top:1px solid #eee;\">",
    "              " + (footer || "<p style=\"margin:0;font-size:12px;color:" + BRAND.mutedText + ";line-height:1.6;\">This is an automated message from EQB. Please do not reply directly to this email.</p>"),
    "            </td>",
    "          </tr>",
    "        </table>",
    "      </td>",
    "    </tr>",
    "  </table>",
    "</body>",
    "</html>",
  ].join("");
}

function escapeHtml(value: string): string {
  const LT = String.fromCharCode(60);
  const GT = String.fromCharCode(62);
  const AMP = String.fromCharCode(38);
  const QUOT = String.fromCharCode(34);
  const APOS = String.fromCharCode(39);
  return value.replace(/&/g, AMP).replace(/</g, LT).replace(/>/g, GT).replace(/"/g, QUOT).replace(/'/g, APOS);
}

export function otpTemplate(otp: string): { subject: string; html: string } {
  const content = [
    '<p style="margin:0 0 8px;font-size:14px;color:' + BRAND.mutedText + ';">Your sign-in code is:</p>',
    '<div style="background-color:' + BRAND.cream + ';border-radius:10px;padding:20px;text-align:center;margin:24px 0;">',
    '  <span style="font-size:36px;font-weight:800;color:' + BRAND.crimson + ';letter-spacing:12px;">' + otp + '</span>',
    "</div>",
    '<p style="margin:0;font-size:13px;color:' + BRAND.mutedText + ';line-height:1.6;">This code expires in <strong>10 minutes</strong>. If you didn\'t request this, you can safely ignore this email.</p>',
  ].join("");
  return { subject: "Your EQB sign-in code", html: baseTemplate(content) };
}

export function welcomeTemplate(name: string): { subject: string; html: string } {
  const cta = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const content = [
    '<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:' + BRAND.darkText + ';">Welcome to EQB' + (name ? ", " + escapeHtml(name) : "") + "!</h2>",
    '<p style="margin:0 0 20px;font-size:15px;color:' + BRAND.mutedText + ';line-height:1.65;">Your account has been created successfully. You can now access past questions, submit solutions, and rate community content on the EQB platform.</p>',
    '<div style="text-align:center;margin:28px 0;">',
    '  <a href="' + cta + '" style="display:inline-block;background-color:' + BRAND.crimson + ';color:#ffffff;font-size:15px;font-weight:600;padding:13px 32px;border-radius:8px;text-decoration:none;">Get Started</a>',
    "</div>",
    '<p style="margin:0;font-size:13px;color:' + BRAND.mutedText + ';line-height:1.6;">If you have any questions, feel free to reach out to the support team.</p>',
  ].join("");
  const footer = '<p style="margin:0;font-size:12px;color:' + BRAND.mutedText + ';line-height:1.6;">&#169; ' + new Date().getFullYear() + " EQB &#183; Past Questions Platform</p>";
  return { subject: "Welcome to EQB \u2014 Your account is ready!", html: baseTemplate(content, footer) };
}

export function passwordResetTemplate(resetLink: string, isAdmin = false): { subject: string; html: string } {
  const adminLabel = isAdmin ? " <strong>EQB admin</strong>" : "";
  const content = [
    '<h2 style="margin:0 0 12px;font-size:22px;font-weight:700;color:' + BRAND.darkText + ';">Password Reset Request</h2>',
    '<p style="margin:0 0 20px;font-size:15px;color:' + BRAND.mutedText + ';line-height:1.65;">We received a request to reset the password for your' + adminLabel + " account. Click the button below to set a new password.</p>",
    '<div style="text-align:center;margin:28px 0;">',
    '  <a href="' + resetLink + '" style="display:inline-block;background-color:' + BRAND.crimson + ';color:#ffffff;font-size:15px;font-weight:600;padding:13px 32px;border-radius:8px;text-decoration:none;">Reset Password</a>',
    "</div>",
    '<p style="margin:0 0 12px;font-size:13px;color:' + BRAND.mutedText + ';line-height:1.6;">This link expires in <strong>24 hours</strong>. If you didn\'t request this, you can safely ignore this email and your password will remain unchanged.</p>',
    '<p style="margin:0;font-size:12px;color:' + BRAND.mutedText + ';line-height:1.6;">If the button doesn\'t work, copy and paste this URL into your browser:<br/><a href="' + resetLink + '" style="color:' + BRAND.crimson + ';word-break:break-all;">' + resetLink + "</a></p>",
  ].join("");
  return {
    subject: isAdmin ? "Reset your EQB admin password" : "Reset your EQB password",
    html: baseTemplate(content),
  };
}

export function feedbackTemplate(
  studentName: string,
  programmeName: string,
  message: string,
): { subject: string; html: string } {
  const escapedStudent = escapeHtml(studentName);
  const escapedProgramme = escapeHtml(programmeName);
  const escapedMessage = escapeHtml(message).replace(/\n/g, "<br/>");
  const content = [
    '<h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:' + BRAND.darkText + ';">New EQB Student Feedback</h2>',
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">',
    "  <tr>",
    '    <td style="padding:8px 0;border-bottom:1px solid #eee;">',
    '      <strong style="color:' + BRAND.darkText + ';font-size:13px;">Student</strong>',
    "    </td>",
    '    <td style="padding:8px 0;border-bottom:1px solid #eee; text-align:right;color:' + BRAND.mutedText + ';font-size:14px;">' + escapedStudent + "</td>",
    "  </tr>",
    "  <tr>",
    '    <td style="padding:8px 0;border-bottom:1px solid #eee;">',
    '      <strong style="color:' + BRAND.darkText + ';font-size:13px;">Programme</strong>',
    "    </td>",
    '    <td style="padding:8px 0;border-bottom:1px solid #eee; text-align:right;color:' + BRAND.mutedText + ';font-size:14px;">' + escapedProgramme + "</td>",
    "  </tr>",
    "  <tr>",
    '    <td style="padding:8px 0;">',
    '      <strong style="color:' + BRAND.darkText + ';font-size:13px;">Submitted</strong>',
    "    </td>",
    '    <td style="padding:8px 0; text-align:right;color:' + BRAND.mutedText + ';font-size:14px;">' + new Date().toLocaleString() + "</td>",
    "  </tr>",
    "</table>",
    '<div style="background-color:' + BRAND.cream + ';border-radius:8px;padding:16px 20px;margin-top:16px;">',
    '<p style="margin:0;font-size:14px;color:' + BRAND.darkText + ';line-height:1.7;white-space:pre-wrap;">' + escapedMessage + "</p>",
    "</div>",
  ].join("");
  return { subject: "New EQB student feedback", html: baseTemplate(content) };
}