import { NextResponse } from "next/server";
import {
  getAnchorAttestationRequest,
  updateAnchorAttestationRequestStatus,
} from "@/lib/anchor/service";
import type { AnchorRequestStatus } from "@/lib/anchor/types";

const STATUSES = new Set<AnchorRequestStatus>([
  "pending",
  "fulfilled",
  "rejected",
  "expired",
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const attestationRequest = getAnchorAttestationRequest(id);
  if (!attestationRequest) {
    return NextResponse.json({ error: "Attestation request not found." }, { status: 404 });
  }
  return NextResponse.json({ request: attestationRequest });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: AnchorRequestStatus };
    if (!body.status || !STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid request status." }, { status: 400 });
    }
    return NextResponse.json({
      request: updateAnchorAttestationRequestStatus(id, body.status),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status update failed." },
      { status: 400 },
    );
  }
}
