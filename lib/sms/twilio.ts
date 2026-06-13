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

interface TwilioVerifyClient {
  verify: {
    v2: {
      services(serviceSid: string): {
        verifications: {
          create(input: { to: string; channel: string }): Promise<{ status: string }>;
        };
        verificationChecks: {
          create(input: { to: string; code: string }): Promise<{ status: string }>;
        };
      };
    };
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

function getVerifyConfig():
  | { ok: true; accountSid: string; authToken: string; serviceSid: string }
  | { ok: false; error: string } {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID?.trim();
  if (!accountSid || !authToken || !serviceSid) {
    return {
      ok: false,
      error:
        "Twilio Verify is not configured (need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID).",
    };
  }
  return { ok: true, accountSid, authToken, serviceSid };
}

/** Whether Twilio Verify is configured to send/check phone codes. */
export function isVerifyConfigured(): boolean {
  return getVerifyConfig().ok;
}

/** Start a Twilio Verify SMS verification — Twilio generates and sends the code. */
export async function startPhoneVerification(to: string): Promise<SmsResult> {
  const phone = normalizePhoneNumber(to);
  if (!phone) return { ok: false, error: "Enter a valid phone number." };
  const config = getVerifyConfig();
  if (!config.ok) return config;
  try {
    const client = twilio(config.accountSid, config.authToken) as unknown as TwilioVerifyClient;
    await client.verify.v2
      .services(config.serviceSid)
      .verifications.create({ to: phone, channel: "sms" });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to send code.",
    };
  }
}

/** Check a code against Twilio Verify. Returns whether it was approved. */
export async function checkPhoneVerification(
  to: string,
  code: string,
): Promise<{ ok: true; approved: boolean } | { ok: false; error: string }> {
  const phone = normalizePhoneNumber(to);
  if (!phone) return { ok: false, error: "Invalid phone number." };
  const config = getVerifyConfig();
  if (!config.ok) return config;
  try {
    const client = twilio(config.accountSid, config.authToken) as unknown as TwilioVerifyClient;
    const result = await client.verify.v2
      .services(config.serviceSid)
      .verificationChecks.create({ to: phone, code });
    return { ok: true, approved: result.status === "approved" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to check code.",
    };
  }
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

/** Whether Twilio is configured to actually deliver SMS. */
export function isSmsDeliveryConfigured(): boolean {
  return getTwilioConfig().ok;
}

export async function sendVerificationCodeSms(
  to: string,
  code: string,
): Promise<SmsResult> {
  return sendSms({
    to,
    body: `Your Anchor verification code is ${code}. It expires in 10 minutes.`,
  });
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
