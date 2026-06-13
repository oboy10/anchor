import "server-only";

import { Resend } from "resend";

/** Whether Resend is configured to actually deliver email. */
export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM?.trim());
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

type ResendClientFactory = (apiKey: string) => ResendEmailClient;

let clientFactoryForTesting: ResendClientFactory | undefined;

export function setResendClientFactoryForTesting(
  factory: ResendClientFactory | undefined,
) {
  clientFactoryForTesting = factory;
}

function codeEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0;padding:0;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4ef;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:440px;background:#fdfcf9;border:1px solid #e7e2d8;border-radius:12px;">
          <tr><td style="padding:28px;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#2b2a26;">Anchor verification code</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6f6b62;">Enter this code to verify your email. It expires in 10 minutes.</p>
            <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:8px;color:#2f6b58;">${code}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationCodeEmail(
  to: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false, error: "Email is not configured." };
  }
  const createClient = clientFactoryForTesting ?? ((key: string) => new Resend(key));
  const { error } = await createClient(apiKey).emails.send({
    from,
    to: to.trim(),
    subject: `Your Anchor verification code: ${code}`,
    html: codeEmailHtml(code),
  });
  if (error) return { ok: false, error: error.message || "Failed to send email." };
  return { ok: true };
}
