import { NextResponse } from "next/server";
import { resolveDownloadToken } from "@/modules/fulfillment";

export const runtime = "nodejs";

/**
 * RCCF-TRACK-01 Phase 4 — secure download delivery.
 * The signed token is the only path to the file: expiry + download-limit
 * enforced, then a redirect to the (private) file URL. No public exposure.
 * GET /api/fulfillment/download/[token]
 */
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const token = params.token;
  const result = await resolveDownloadToken(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Invalid download" }, { status: 403 });
  }
  return NextResponse.redirect(result.url!, 302);
}
