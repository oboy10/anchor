import { NextResponse } from "next/server";
import { isValidEmail } from "@/lib/email/share-packet";
import { registerEmailHash } from "@/lib/firebase/email-registry";

/** Record a registered email as a SHA-256 hash — the only server-side data. */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }
  if (!body.email || !isValidEmail(body.email)) {
    return NextResponse.json({ ok: false, error: "Invalid email." }, { status: 400 });
  }
  try {
    const result = await registerEmailHash(body.email);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "Registry unavailable." }, { status: 500 });
  }
}
