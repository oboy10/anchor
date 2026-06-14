import "server-only";

import { Resend } from "resend";
import { getAppBaseUrl, isValidEmail } from "./share-packet";

export interface SendCredentialDeliveryEmailInput {
  to: string;
  issuerName: string;
  credentialTitle: string;
  acceptUrl: string;
  expiresInDays: number;
}

interface ResendEmailClient {
  emails: {
    send(input: {
      from: string;
      to: string;
      subject: string;
      html: string;
    }): Promise<{ error?: { message?: string } | null }>;
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function credentialDeliveryHtml(input: SendCredentialDeliveryEmailInput): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>New credential on Anchor</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f4ef;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4ef;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#fdfcf9;border:1px solid #e7e2d8;border-radius:12px;">
            <tr>
              <td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:600;color:#2b2a26;">
                  ${escapeHtml(input.issuerName)} issued you a credential
                </h1>
                <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6f6b62;">
                  <strong style="color:#2b2a26;">${escapeHtml(input.credentialTitle)}</strong>
                  was signed for your Anchor wallet. Open the link below to review and add it to your record.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:8px;background:#19807f;">
                      <a href="${escapeHtml(input.acceptUrl)}" style="display:inline-block;padding:12px 20px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                        Review credential
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;font-size:13px;line-height:1.5;color:#918c81;">
                  This link expires in ${input.expiresInDays} day${input.expiresInDays === 1 ? "" : "s"}.
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

export async function sendCredentialDeliveryEmail(
  input: SendCredentialDeliveryEmailInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidEmail(input.to)) {
    return { ok: false, error: "Invalid recipient email." };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false, error: "Email is not configured (RESEND_API_KEY / RESEND_FROM)." };
  }

  const resend = new Resend(apiKey) as ResendEmailClient;
  const { error } = await resend.emails.send({
    from,
    to: input.to.trim(),
    subject: `${input.issuerName} sent you a credential on Anchor`,
    html: credentialDeliveryHtml(input),
  });

  if (error) {
    return { ok: false, error: error.message || "Failed to send email." };
  }
  return { ok: true };
}

export function buildCredentialAcceptUrl(token: string): string {
  const base = getAppBaseUrl();
  return `${base}/credential/accept?token=${encodeURIComponent(token)}`;
}
