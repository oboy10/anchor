import { NextResponse } from "next/server";
import {
  createCredentialRequest,
  isCredentialRequestConfigured,
} from "@/lib/credential-requests/server";
import {
  buildCredentialRequestFulfillUrl,
  sendCredentialRequestEmail,
} from "@/lib/email/credential-request";
import { isValidEmail } from "@/lib/email/share-packet";

const FINGERPRINT_PATTERN = /^[0-9a-f]{16}$/;

export async function POST(request: Request) {
  try {
    if (!isCredentialRequestConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Credential requests are not configured on this server." },
        { status: 503 },
      );
    }

    let body: {
      requesterFingerprint?: string;
      requesterEmail?: string;
      requesterName?: string;
      issuerEmail?: string;
      message?: string;
      expiresInDays?: number;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
    }

    const requesterFingerprint = body.requesterFingerprint?.trim().toLowerCase() ?? "";
    const requesterEmail = body.requesterEmail?.trim().toLowerCase() ?? "";
    const issuerEmail = body.issuerEmail?.trim().toLowerCase() ?? "";

    if (!FINGERPRINT_PATTERN.test(requesterFingerprint)) {
      return NextResponse.json({ ok: false, error: "Invalid requester fingerprint." }, { status: 400 });
    }
    if (!isValidEmail(requesterEmail)) {
      return NextResponse.json({ ok: false, error: "Verify your email before requesting credentials." }, { status: 400 });
    }
    if (!isValidEmail(issuerEmail)) {
      return NextResponse.json({ ok: false, error: "Enter a valid issuer email." }, { status: 400 });
    }

    const expiresInDays = body.expiresInDays ?? 14;
    const created = await createCredentialRequest({
      requesterFingerprint,
      requesterEmail,
      requesterName: body.requesterName?.trim() || "A resident",
      issuerEmail,
      message: body.message,
      expiresInDays,
    });

    if (!created.ok) {
      return NextResponse.json({ ok: false, error: created.error }, { status: 502 });
    }

    const fulfillUrl = buildCredentialRequestFulfillUrl(created.token);
    const emailed = await sendCredentialRequestEmail({
      to: issuerEmail,
      requesterName: body.requesterName?.trim() || "A resident",
      fulfillUrl,
      message: body.message,
      expiresInDays,
    });

    if (!emailed.ok) {
      return NextResponse.json(
        { ok: false, error: emailed.error, fulfillUrl },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      token: created.token,
      fulfillUrl,
      expiresAt: created.expiresAt,
      emailSent: true,
    });
  } catch (error) {
    console.error("[credential/request]", error);
    return NextResponse.json(
      { ok: false, error: "Could not create credential request." },
      { status: 500 },
    );
  }
}
