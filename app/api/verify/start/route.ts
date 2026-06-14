import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/email/share-packet";
import { sendVerificationCodeEmail, isEmailDeliveryConfigured } from "@/lib/email/verification";
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  sendVerificationCodeSms,
  isSmsDeliveryConfigured,
  isVerifyConfigured,
  startPhoneVerification,
} from "@/lib/sms/twilio";
import {
  createPendingCode,
  type Channel,
} from "@/lib/verification/server";

/**
 * Start contact verification: generate a code, store its hash, and deliver it.
 * When delivery is unconfigured (local dev), the code is returned as `devCode`.
 */
export async function POST(request: Request) {
  let body: { channel?: string; value?: string };
  try {
    body = (await request.json()) as { channel?: string; value?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const channel = body.channel as Channel | undefined;
  if (channel !== "email" && channel !== "phone") {
    return NextResponse.json({ ok: false, error: "Invalid channel." }, { status: 400 });
  }

  let value: string;
  if (channel === "email") {
    value = (body.value ?? "").trim().toLowerCase();
    if (!isValidEmail(value)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
    }
  } else {
    const normalized = normalizePhoneNumber(body.value ?? "");
    if (!normalized || !isValidPhoneNumber(normalized)) {
      return NextResponse.json({ ok: false, error: "Enter a valid phone number." }, { status: 400 });
    }
    value = normalized;
  }

  // Phone: delegate code generation, delivery, and checking to Twilio Verify.
  if (channel === "phone" && isVerifyConfigured()) {
    const result = await startPhoneVerification(value);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, channel, value, delivered: true });
  }

  // Otherwise (email always; phone only without Verify) use our own code.
  const code = await createPendingCode(channel, value);

  const configured =
    channel === "email" ? isEmailDeliveryConfigured() : isSmsDeliveryConfigured();
  if (configured) {
    const result =
      channel === "email"
        ? await sendVerificationCodeEmail(value, code)
        : await sendVerificationCodeSms(value, code);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, channel, value, delivered: true });
  }

  // Dev fallback: no delivery provider configured — surface the code directly.
  return NextResponse.json({ ok: true, channel, value, delivered: false, devCode: code });
}
