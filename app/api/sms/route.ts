import { NextResponse } from "next/server";
import {
  isValidPhoneNumber,
  normalizePhoneNumber,
  sendSharePacketSms,
  type SendSharePacketSmsInput,
} from "@/lib/sms/twilio";

/**
 * Best-effort reviewer SMS. Carries the self-contained verify URL and stores
 * nothing — the credential data lives entirely in the link the caller built.
 */
export async function POST(request: Request) {
  let body: Partial<SendSharePacketSmsInput>;
  try {
    body = (await request.json()) as Partial<SendSharePacketSmsInput>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.to || !isValidPhoneNumber(body.to)) {
    return NextResponse.json({ ok: false, error: "Invalid phone number." }, { status: 400 });
  }
  if (!body.verifyUrl) {
    return NextResponse.json({ ok: false, error: "Missing verify URL." }, { status: 400 });
  }

  const phone = normalizePhoneNumber(body.to) ?? undefined;
  const result = await sendSharePacketSms({
    to: body.to,
    senderName: body.senderName ?? "Someone",
    packetLabel: body.packetLabel ?? "",
    verifyUrl: body.verifyUrl,
    expiresInDays: body.expiresInDays ?? 14,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, phone });
}
