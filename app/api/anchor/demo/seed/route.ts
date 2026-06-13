import { NextResponse } from "next/server";
import { seedAnchorDemo } from "@/lib/anchor/service";

export async function POST() {
  return NextResponse.json(await seedAnchorDemo(), { status: 201 });
}
