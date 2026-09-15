import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RCCF-LIVE-SMOKE-13 — TEMPORARY SMOKE CHECKOUT DIAGNOSTIC
 * SUPER_ADMIN-gated, POST-only, server-only.
 * Creates a smoke test checkout for a given tenant/plan at ₹1 (when smoke enabled).
 * Uses canonical createSmokeTestCheckout (SUPER_ADMIN-only, server-side ₹1 override).
 * NEVER returns or logs secrets. Returns only checkout ids and amount.
 * TEMPORARY — remove immediately after single use.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized — SUPER_ADMIN only" }, { status: 401 });
  }
  let body: { tenantId?: string; planCode?: string; cycle?: string } = {};
  try {
    body = await request.json();
  } catch {}
  const tenantId = (body.tenantId || "d48702f6-ac0d-40da-98ba-d231bfeaf476").trim();
  const planCode = (body.planCode || "creator_grow").trim();
  const cycle = (body.cycle as "monthly" | "yearly" | undefined) ?? "monthly";

  // Resolve workspaceId for tenant
  const { prisma } = await import("@/lib/prisma");
  const ws = await prisma.workspace.findFirst({ where: { tenantId }, select: { id: true } });
  // Fallback to tenantId if no workspace (Launch tenants may have no workspace row)
  const workspaceId = ws?.id ?? tenantId;

  // Verify smoke mode is enabled (must be)
  const smokeRow = await prisma.liveSmokeTestConfig.findUnique({ where: { id: "live-smoke-test" }, select: { enabled: true } }).catch(() => null);
  const smokeEnabled = !!smokeRow?.enabled;

  // Call canonical smoke checkout (SUPER_ADMIN-only, ₹1)
  const { createSmokeTestCheckout } = await import("@/actions/live-smoke-test.actions");
  const result = await createSmokeTestCheckout({ workspaceId, planCode, cycle });

  return NextResponse.json({
    success: result.success,
    smokeEnabled,
    workspaceId,
    tenantId,
    planCode,
    cycle,
    checkout: result.checkout ?? null,
    error: (result as { error?: string }).error ?? null,
  });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed — use POST" }, { status: 405 });
}
