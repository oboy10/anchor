import { NextResponse } from "next/server";
import { getCredentialRequest } from "@/lib/credential-requests/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  if (!token?.trim()) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const request = await getCredentialRequest(token.trim());
  if (!request) {
    return NextResponse.json({ ok: false, error: "Request not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    request: {
      token: request.token,
      status: request.status,
      requesterName: request.requesterName,
      requesterFingerprint: request.requesterFingerprint,
      message: request.message,
      expiresAt: request.expiresAt,
      fulfilledAt: request.fulfilledAt,
    },
  });
}
