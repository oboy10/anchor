import { NextResponse } from "next/server";
import {
  createAnchorAttestationRequest,
  listAnchorAttestationRequests,
  lookupAnchorIdentity,
} from "@/lib/anchor/service";
import { getAppBaseUrl, isValidEmail } from "@/lib/email/share-packet";
import {
  normalizePhoneNumber,
  sendAttestationRequestSms,
} from "@/lib/sms/twilio";
import type { AttestationRequestCreate } from "@/lib/anchor/types";

function createRequestInput(input: AttestationRequestCreate): {
  requestInput: AttestationRequestCreate;
  recipientPhone?: string;
} {
  const deliveryMethod =
    input.deliveryMethod ??
    (input.recipientPhone ? "sms" : input.recipientEmail ? "email" : "none");
  const recipientEmail = input.recipientEmail?.trim();
  const recipientPhone = input.recipientPhone?.trim();

  if (deliveryMethod === "email" && !recipientEmail) {
    throw new Error("Recipient email is required for email delivery.");
  }
  if (deliveryMethod === "email" && recipientEmail && !isValidEmail(recipientEmail)) {
    throw new Error("Enter a valid recipient email address.");
  }

  const normalizedPhone =
    deliveryMethod === "sms" && recipientPhone
      ? normalizePhoneNumber(recipientPhone)
      : undefined;
  if (deliveryMethod === "sms" && !normalizedPhone) {
    throw new Error("Enter a valid recipient phone number.");
  }

  const externalContact =
    input.externalContact ??
    (deliveryMethod === "sms" && normalizedPhone
      ? { type: "phone", url: `tel:${normalizedPhone}` }
      : deliveryMethod === "email" && recipientEmail
        ? { type: "email", url: `mailto:${recipientEmail}` }
        : undefined);

  return {
    requestInput: {
      subjectFingerprint: input.subjectFingerprint,
      issuerFingerprint: input.issuerFingerprint,
      externalContact,
      requestedType: input.requestedType,
      requestedFields: input.requestedFields,
      note: input.note,
    },
    recipientPhone: normalizedPhone ?? undefined,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.json({
    requests: listAnchorAttestationRequests({
      subjectFingerprint: url.searchParams.get("subject") ?? undefined,
      issuerFingerprint: url.searchParams.get("issuer") ?? undefined,
    }),
  });
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as AttestationRequestCreate;
    const { requestInput, recipientPhone } = createRequestInput(input);
    const attestationRequest = createAnchorAttestationRequest(requestInput);

    let smsSent = false;
    let smsError: string | undefined;
    if (recipientPhone) {
      const requester = lookupAnchorIdentity(attestationRequest.subjectFingerprint);
      const requesterName =
        requester?.displayLabel ?? requester?.organization?.legalName ?? "Someone";
      const smsResult = await sendAttestationRequestSms({
        to: recipientPhone,
        requesterName,
        requestedType: attestationRequest.requestedType,
        requestUrlOrContext: `${getAppBaseUrl()}/provider?attestationRequest=${attestationRequest.id}`,
      });

      if (smsResult.ok) {
        smsSent = true;
      } else {
        smsError = smsResult.error;
      }
    }

    return NextResponse.json(
      {
        request: attestationRequest,
        smsSent,
        smsError,
        recipientPhone,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Attestation request failed." },
      { status: 400 },
    );
  }
}
