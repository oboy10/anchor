import { NextResponse } from "next/server";
import { verifyAnchorPresentation } from "@/lib/anchor/service";
import type { PresentationVerifyRequest } from "@/lib/anchor/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as PresentationVerifyRequest;
    return NextResponse.json(await verifyAnchorPresentation(input));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Presentation verification failed." },
      { status: 400 },
    );
  }
}
