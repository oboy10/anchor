import { NextResponse } from "next/server";
import { acceptCredentialDelivery } from "@/lib/credential-delivery/server";
import { isValidEmail } from "@/lib/email/share-packet";

const FINGERPRINT_PATTERN = /^[0-9a-f]{16}$/;

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  let body: { fingerprint?: string; email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const fingerprint = body.fingerprint?.trim().toLowerCase() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!FINGERPRINT_PATTERN.test(fingerprint)) {
    return NextResponse.json({ ok: false, error: "Invalid fingerprint." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email." }, { status: 400 });
  }

  const result = await acceptCredentialDelivery(token.trim(), fingerprint, email);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
