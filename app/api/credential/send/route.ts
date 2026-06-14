import { NextResponse } from "next/server";
import {
  createCredentialDelivery,
  isCredentialDeliveryConfigured,
} from "@/lib/credential-delivery/server";
import { fulfillCredentialRequest } from "@/lib/credential-requests/server";
import {
  buildCredentialAcceptUrl,
  sendCredentialDeliveryEmail,
} from "@/lib/email/credential-delivery";
import { isValidEmail } from "@/lib/email/share-packet";
import type { Attestation, Provider, User } from "@/types";

const FINGERPRINT_PATTERN = /^[0-9a-f]{16}$/;

export async function POST(request: Request) {
  if (!isCredentialDeliveryConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Credential delivery is not configured on this server." },
      { status: 503 },
    );
  }

  let body: {
    toEmail?: string;
    recipientFingerprint?: string;
    issuerFingerprint?: string;
    issuerName?: string;
    title?: string;
    summary?: string;
    attestation?: Attestation;
    users?: User[];
    providers?: Provider[];
    expiresInDays?: number;
    requestToken?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  let toEmail = body.toEmail?.trim().toLowerCase() ?? "";
  let recipientFingerprint = body.recipientFingerprint?.trim().toLowerCase() ?? "";
  const requestToken = body.requestToken?.trim();

  if (requestToken) {
    const { getCredentialRequest } = await import("@/lib/credential-requests/server");
    const req = await getCredentialRequest(requestToken);
    if (!req) {
      return NextResponse.json({ ok: false, error: "Credential request not found." }, { status: 404 });
    }
    if (req.status === "expired") {
      return NextResponse.json({ ok: false, error: "This credential request has expired." }, { status: 400 });
    }
    if (req.status === "fulfilled") {
      return NextResponse.json({ ok: false, error: "This request was already fulfilled." }, { status: 400 });
    }
    toEmail = req.requesterEmail;
    recipientFingerprint = req.requesterFingerprint;
  }

  if (!isValidEmail(toEmail)) {
    return NextResponse.json({ ok: false, error: "Enter a valid recipient email." }, { status: 400 });
  }

  const issuerFingerprint = body.issuerFingerprint?.trim().toLowerCase() ?? "";
  if (!FINGERPRINT_PATTERN.test(recipientFingerprint) || !FINGERPRINT_PATTERN.test(issuerFingerprint)) {
    return NextResponse.json({ ok: false, error: "Invalid fingerprint." }, { status: 400 });
  }

  const title = body.title?.trim() ?? "";
  const summary = body.summary?.trim() ?? "";
  if (!title || !summary) {
    return NextResponse.json({ ok: false, error: "Title and summary are required." }, { status: 400 });
  }

  if (!body.attestation?.signature || body.attestation.to !== recipientFingerprint) {
    return NextResponse.json({ ok: false, error: "Invalid signed attestation." }, { status: 400 });
  }

  const expiresInDays = body.expiresInDays ?? 30;
  const created = await createCredentialDelivery({
    recipientEmail: toEmail,
    recipientFingerprint,
    issuerFingerprint,
    issuerName: body.issuerName?.trim() || "Someone",
    title,
    summary,
    attestation: body.attestation,
    users: body.users ?? [],
    providers: body.providers ?? [],
    expiresInDays,
  });

  if (!created.ok) {
    return NextResponse.json({ ok: false, error: created.error }, { status: 502 });
  }

  if (requestToken) {
    await fulfillCredentialRequest(requestToken, created.token);
    return NextResponse.json({
      ok: true,
      token: created.token,
      expiresAt: created.expiresAt,
      emailSent: false,
      autoDelivered: true,
    });
  }

  const acceptUrl = buildCredentialAcceptUrl(created.token);
  const emailed = await sendCredentialDeliveryEmail({
    to: toEmail,
    issuerName: body.issuerName?.trim() || "Someone",
    credentialTitle: title,
    acceptUrl,
    expiresInDays,
  });

  if (!emailed.ok) {
    return NextResponse.json({ ok: false, error: emailed.error, token: created.token, acceptUrl }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    token: created.token,
    acceptUrl,
    expiresAt: created.expiresAt,
    emailSent: true,
  });
}
