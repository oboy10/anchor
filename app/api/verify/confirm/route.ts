import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/email/share-packet";
import {
  checkPhoneVerification,
  isValidPhoneNumber,
  isVerifyConfigured,
  normalizePhoneNumber,
} from "@/lib/sms/twilio";
import { issueIdentityVouch } from "@/lib/anchor/verifier";
import { registerContactDirectory } from "@/lib/firebase/contact-directory";
import {
  consumeCode,
  type Channel,
} from "@/lib/verification/server";

/**
 * Confirm a verification code. On success: map the contact to this account's
 * fingerprint (for credential delivery) and issue a signed identity vouch from
 * the Anchor verifier wallet to the user (spec.md §4). Returns the signed
 * attestation for the client to store in its local ledger.
 */
export async function POST(request: Request) {
  let body: { channel?: string; value?: string; code?: string; fingerprint?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const channel = body.channel as Channel | undefined;
  if (channel !== "email" && channel !== "phone") {
    return NextResponse.json({ ok: false, error: "Invalid channel." }, { status: 400 });
  }
  if (!body.fingerprint || !/^[0-9a-f]{16}$/.test(body.fingerprint)) {
    return NextResponse.json({ ok: false, error: "Invalid account fingerprint." }, { status: 400 });
  }
  if (!body.code || !/^\d{6}$/.test(body.code)) {
    return NextResponse.json({ ok: false, error: "Enter the 6-digit code." }, { status: 400 });
  }

  let value: string;
  if (channel === "email") {
    value = (body.value ?? "").trim().toLowerCase();
    if (!isValidEmail(value)) {
      return NextResponse.json({ ok: false, error: "Invalid email." }, { status: 400 });
    }
  } else {
    const normalized = normalizePhoneNumber(body.value ?? "");
    if (!normalized || !isValidPhoneNumber(normalized)) {
      return NextResponse.json({ ok: false, error: "Invalid phone number." }, { status: 400 });
    }
    value = normalized;
  }

  let approved: boolean;
  if (channel === "phone" && isVerifyConfigured()) {
    const result = await checkPhoneVerification(value, body.code);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    }
    approved = result.approved;
  } else {
    approved = await consumeCode(channel, value, body.code);
  }
  if (!approved) {
    return NextResponse.json(
      { ok: false, error: "That code is incorrect or expired." },
      { status: 400 },
    );
  }

  await registerContactDirectory(channel, value, body.fingerprint);

  const vouch = await issueIdentityVouch(
    body.fingerprint,
    channel === "email" ? { email: value } : { phone: value },
  );

  return NextResponse.json({ ok: true, ...vouch });
}
