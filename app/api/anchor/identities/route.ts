import { NextResponse } from "next/server";
import {
  listAnchorIdentities,
  registerAnchorIdentity,
} from "@/lib/anchor/service";
import type { IdentityRegistrationRequest } from "@/lib/anchor/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const issuersOnly = url.searchParams.get("role") === "issuer";
  return NextResponse.json({ identities: listAnchorIdentities({ issuersOnly }) });
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as IdentityRegistrationRequest;
    const response = await registerAnchorIdentity(input);
    return NextResponse.json(response, { status: response.created ? 201 : 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Identity registration failed." },
      { status: 400 },
    );
  }
}
