import { NextResponse } from "next/server";
import { getAnchorPublicContext } from "@/lib/anchor/service";

export async function GET() {
  return NextResponse.json(getAnchorPublicContext());
}
