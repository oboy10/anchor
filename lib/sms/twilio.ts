import "server-only";

import twilio from "twilio";

export type SmsResult = { ok: true } | { ok: false; error: string };

export interface SendSharePacketSmsInput {
  to: string;
  senderName: string;
  packetLabel: string;
  verifyUrl: string;
  expiresInDays: number;
}

export interface SendAttestationRequestSmsInput {
  to: string;
  requesterName: string;
  requestedType: string;
  requestUrlOrContext: string;
}

interface TwilioMessageClient {
  messages: {
    create(input: {
      to: string;
      messagingServiceSid: string;
      body: string;
    }): Promise<unknown>;
  };
}

type TwilioClientFactory = (
  accountSid: string,
  authToken: string,
) => TwilioMessageClient;

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

let clientFactoryForTesting: TwilioClientFactory | undefined;

export function setTwilioClientFactoryForTesting(
  factory: TwilioClientFactory | undefined,
) {
  clientFactoryForTesting = factory;
}

export function normalizePhoneNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const compact = trimmed.replace(/[\s().-]/g, "");
  if (E164_PATTERN.test(compact)) return compact;

  const digits = compact.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return null;
}

export function isValidPhoneNumber(value: string): boolean {
  return normalizePhoneNumber(value) !== null;
}

function getTwilioConfig():
  | {
      ok: true;
      accountSid: string;
      authToken: string;
      messagingServiceSid: string;
    }
  | { ok: false; error: string } {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (!accountSid) {
    return { ok: false, error: "SMS is not configured (missing TWILIO_ACCOUNT_SID)." };
  }

  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!authToken) {
    return { ok: false, error: "SMS is not configured (missing TWILIO_AUTH_TOKEN)." };
  }

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (!messagingServiceSid) {
    return {
      ok: false,
      error: "SMS is not configured (missing TWILIO_MESSAGING_SERVICE_SID).",
    };
  }

  return { ok: true, accountSid, authToken, messagingServiceSid };
}

async function sendSms(input: { to: string; body: string }): Promise<SmsResult> {
  const to = normalizePhoneNumber(input.to);
  if (!to) return { ok: false, error: "Enter a valid phone number." };

  const config = getTwilioConfig();
  if (!config.ok) return config;

  try {
    const clientFactory = clientFactoryForTesting ?? twilio;
    const client = clientFactory(config.accountSid, config.authToken);
    await client.messages.create({
      to,
      messagingServiceSid: config.messagingServiceSid,
      body: input.body,
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send SMS.",
    };
  }
}

export async function sendSharePacketSms(
  input: SendSharePacketSmsInput,
): Promise<SmsResult> {
  const body = `${input.senderName} shared an Anchor verification link: ${input.verifyUrl}. Expires in ${input.expiresInDays} day${input.expiresInDays === 1 ? "" : "s"}.`;
  return sendSms({ to: input.to, body });
}

export async function sendAttestationRequestSms(
  input: SendAttestationRequestSmsInput,
): Promise<SmsResult> {
  const body = `${input.requesterName} requested an Anchor verification from you: ${input.requestUrlOrContext}.`;
  return sendSms({ to: input.to, body });
}
