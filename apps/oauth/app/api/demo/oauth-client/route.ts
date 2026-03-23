import { resolveDemoClientPublicState } from "@/lib/demo-oauth-server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** Effective demo OAuth client_id for the browser (cookie in dev, then env). */
export async function GET() {
  const store = await cookies();
  return NextResponse.json(resolveDemoClientPublicState(store));
}
