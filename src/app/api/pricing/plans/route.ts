import { NextResponse } from "next/server";
import { getPublicPricingData } from "@/modules/pricing/application/runtime";

export const dynamic = "force-dynamic";

/**
 * RCCF-IMPLEMENTATION-71 Phase 13 — public pricing API.
 * Single source: the runtime pricing module (BillingPlan + registry fallback).
 * Returns public comparison plans + enterprise tiers. No hidden/enterprise rows
 * in the comparison list.
 */
export async function GET() {
  try {
    const data = await getPublicPricingData();
    return NextResponse.json({
      ok: true,
      currency: "INR",
      creator: data.creator,
      partner: data.partner,
      enterprise: {
        creator: data.enterpriseCreator,
        partner: data.enterprisePartner,
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
