import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/email/share-packet";
import { resolveFingerprintByEmail } from "@/lib/firebase/contact-directory";

/** Resolve a verified email to the recipient's Anchor fingerprint. */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  }

  const fingerprint = await resolveFingerprintByEmail(email);
  if (!fingerprint) {
    return NextResponse.json({
      ok: false,
      error:
        "No Anchor account is linked to that email yet. Ask them to create an account and verify their email first.",
    });
  }

  return NextResponse.json({ ok: true, fingerprint });
}
