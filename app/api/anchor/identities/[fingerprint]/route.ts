import { NextResponse } from "next/server";
import { lookupAnchorIdentity } from "@/lib/anchor/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fingerprint: string }> },
) {
  const { fingerprint } = await params;
  const identity = lookupAnchorIdentity(fingerprint);
  if (!identity) {
    return NextResponse.json({ error: "Identity not found." }, { status: 404 });
  }
  return NextResponse.json({ identity });
}
