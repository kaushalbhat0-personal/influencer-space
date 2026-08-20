import { NextResponse } from "next/server";
import { getPublicPricingData } from "@/modules/pricing/application/runtime";
import { captureError } from "@/lib/observability/error-tracker";

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
    // RCCF-72.17A: never leak internal exception detail to public callers.
    captureError(e, { service: "pricing-api", operation: "plans" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
