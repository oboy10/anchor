import { NextResponse } from "next/server";
import { getCredentialDelivery } from "@/lib/credential-delivery/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const delivery = await getCredentialDelivery(token.trim());
  if (!delivery) {
    return NextResponse.json({ ok: false, error: "Delivery not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    delivery: {
      token: delivery.token,
      status: delivery.status,
      title: delivery.title,
      summary: delivery.summary,
      issuerName: delivery.issuerName,
      issuerFingerprint: delivery.issuerFingerprint,
      recipientFingerprint: delivery.recipientFingerprint,
      attestation: delivery.attestation,
      users: delivery.users,
      providers: delivery.providers,
      expiresAt: delivery.expiresAt,
      acceptedAt: delivery.acceptedAt,
    },
  });
}
