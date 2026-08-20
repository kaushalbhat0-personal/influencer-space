import { NextResponse } from "next/server";
import { getUpgrade, getEffectiveMonthlyPrice, getRuntimePlan } from "@/modules/pricing/application/runtime";
import { captureError } from "@/lib/observability/error-tracker";

export const dynamic = "force-dynamic";

/**
 * RCCF-IMPLEMENTATION-71 Phase 13 — upgrade API. Given a plan code, returns the
 * next visible tier + exactly what it adds, derived from the runtime.
 * GET /api/pricing/upgrade?plan=creator_grow
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("plan") ?? "";
  if (!code) return NextResponse.json({ ok: false, error: "plan is required" }, { status: 400 });

  try {
    const [plan, upgrade, monthly, yearly] = await Promise.all([
      getRuntimePlan(code),
      getUpgrade(code),
      getEffectiveMonthlyPrice(code, "monthly"),
      getEffectiveMonthlyPrice(code, "yearly"),
    ]);
    if (!plan) return NextResponse.json({ ok: false, error: "Unknown plan" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      plan: { code: plan.code, name: plan.name },
      upgrade: upgrade.target ? { code: upgrade.target.code, name: upgrade.target.name, price: upgrade.target.price, added: upgrade.added } : null,
      pricing: { monthly, yearly },
    });
  } catch (e) {
    // RCCF-72.17A: never leak internal exception detail to public callers.
    captureError(e, { service: "pricing-api", operation: "upgrade" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
