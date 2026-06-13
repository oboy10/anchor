import { NextResponse } from "next/server";
import {
  createAnchorAttestationRequest,
  listAnchorAttestationRequests,
} from "@/lib/anchor/service";
import type { AttestationRequestCreate } from "@/lib/anchor/types";

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
    const attestationRequest = createAnchorAttestationRequest(input);
    return NextResponse.json({ request: attestationRequest }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Attestation request failed." },
      { status: 400 },
    );
  }
}
