import { NextResponse } from "next/server";
import { issueAnchorMessage } from "@/lib/anchor/service";
import type { IssuanceIntent } from "@/lib/anchor/types";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as IssuanceIntent;
    const issuedMessage = await issueAnchorMessage(input);
    return NextResponse.json({ issuedMessage }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Issuance failed." },
      { status: 400 },
    );
  }
}
