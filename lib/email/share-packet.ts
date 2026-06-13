import "server-only";

import sgMail from "@sendgrid/mail";

export interface SendSharePacketEmailInput {
  to: string;
  senderName: string;
  packetLabel: string;
  verifyUrl: string;
  expiresInDays: number;
  intro?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) {
    return production.startsWith("http")
      ? production.replace(/\/$/, "")
      : `https://${production.replace(/\/$/, "")}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

function parseFromAddress(raw: string): { email: string; name?: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { email: raw.trim() };
}

function sharePacketHtml(input: SendSharePacketEmailInput): string {
  const introBlock = input.intro
    ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6f6b62;">${escapeHtml(input.intro)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Record shared on Anchor</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f4ef;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4ef;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fdfcf9;border:1px solid #e7e2d8;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:32px;height:32px;background:#2f6b58;border-radius:8px;text-align:center;vertical-align:middle;color:#ffffff;font-size:16px;">&#9875;</td>
                    <td style="padding-left:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:18px;font-weight:600;color:#2b2a26;">Anchor</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:600;color:#2b2a26;">
                  ${escapeHtml(input.senderName)} sent you a record
                </h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6f6b62;">
                  They shared verified credentials with you through Anchor
                  ${input.packetLabel ? ` for <strong style="color:#2b2a26;">${escapeHtml(input.packetLabel)}</strong>` : ""}.
                  Open the link below to review what they chose to share.
                </p>
                ${introBlock}
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:8px;background:#2f6b58;">
                      <a href="${escapeHtml(input.verifyUrl)}" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                        View record
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#918c81;">
                  This link expires in ${input.expiresInDays} day${input.expiresInDays === 1 ? "" : "s"}. No account is required to review it.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:#918c81;word-break:break-all;">
                  ${escapeHtml(input.verifyUrl)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sendGridErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "body" in error.response
  ) {
    const body = error.response.body as { errors?: { message: string }[] };
    const detail = body.errors?.map((e) => e.message).join("; ");
    if (detail) return detail;
  }
  if (error instanceof Error) return error.message;
  return "Failed to send email.";
}

export async function sendSharePacketEmail(
  input: SendSharePacketEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "Email is not configured (missing SENDGRID_API_KEY).",
    };
  }

  const fromRaw =
    process.env.SENDGRID_FROM?.trim() || "Anchor <okhaunte2@gmail.com>";
  const from = parseFromAddress(fromRaw);

  sgMail.setApiKey(apiKey);

  try {
    await sgMail.send({
      to: input.to.trim(),
      from,
      subject: `${input.senderName} sent you a record on Anchor`,
      html: sharePacketHtml(input),
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: sendGridErrorMessage(error) };
  }
}
