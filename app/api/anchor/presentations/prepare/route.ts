import { NextResponse } from "next/server";
import { prepareAnchorPresentation } from "@/lib/anchor/service";
import type { PresentationPrepareRequest } from "@/lib/anchor/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as PresentationPrepareRequest;
    return NextResponse.json(prepareAnchorPresentation(input), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Presentation preparation failed." },
      { status: 400 },
    );
  }
}
