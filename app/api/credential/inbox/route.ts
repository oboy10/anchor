import { NextResponse } from "next/server";
import {
  isCredentialDeliveryConfigured,
  listPendingDeliveries,
} from "@/lib/credential-delivery/server";
import { isValidEmail } from "@/lib/email/share-packet";

const FINGERPRINT_PATTERN = /^[0-9a-f]{16}$/;

/** List pending credential deliveries for a signed-in identity + verified email. */
export async function GET(request: Request) {
  if (!isCredentialDeliveryConfigured()) {
    return NextResponse.json({ ok: true, deliveries: [] });
  }

  const { searchParams } = new URL(request.url);
  const fingerprint = searchParams.get("fingerprint")?.trim().toLowerCase() ?? "";
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (!FINGERPRINT_PATTERN.test(fingerprint)) {
    return NextResponse.json({ ok: false, error: "Invalid fingerprint." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Invalid email." }, { status: 400 });
  }

  const deliveries = await listPendingDeliveries(fingerprint, email);
  return NextResponse.json({
    ok: true,
    deliveries: deliveries.map((d) => ({
      token: d.token,
      title: d.title,
      summary: d.summary,
      issuerName: d.issuerName,
      issuerFingerprint: d.issuerFingerprint,
      attestation: d.attestation,
      users: d.users,
      providers: d.providers,
      expiresAt: d.expiresAt,
    })),
  });
}
