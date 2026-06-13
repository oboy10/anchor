import { NextResponse } from "next/server";
import {
  isValidEmail,
  sendSharePacketEmail,
  type SendSharePacketEmailInput,
} from "@/lib/email/share-packet";

/**
 * Best-effort reviewer email. Carries the self-contained verify URL and stores
 * nothing — the credential data lives entirely in the link the caller built.
 */
export async function POST(request: Request) {
  let body: Partial<SendSharePacketEmailInput>;
  try {
    body = (await request.json()) as Partial<SendSharePacketEmailInput>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.to || !isValidEmail(body.to)) {
    return NextResponse.json({ ok: false, error: "Invalid recipient email." }, { status: 400 });
  }
  if (!body.verifyUrl) {
    return NextResponse.json({ ok: false, error: "Missing verify URL." }, { status: 400 });
  }

  const result = await sendSharePacketEmail({
    to: body.to,
    senderName: body.senderName ?? "Someone",
    packetLabel: body.packetLabel ?? "",
    verifyUrl: body.verifyUrl,
    expiresInDays: body.expiresInDays ?? 14,
    intro: body.intro,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
