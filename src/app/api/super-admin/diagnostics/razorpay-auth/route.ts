import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RCCF-LIVE-SMOKE-11 — TEMPORARY PRODUCTION-RUNTIME RAZORPAY AUTH DIAGNOSTIC
 *
 * Server-only, SUPER_ADMIN-gated, POST-only.
 * Reads ONLY process.env.RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.
 * Calls ONLY razorpay.plans.all({count:1}) — read-only.
 * NEVER returns or logs keyId/keySecret.
 * Returns ONLY: success, statusCode, errorCode, errorDescription, errorReason, planCount.
 *
 * TEMPORARY — remove immediately after single SUPER_ADMIN call.
 * NOTE: Next.js treats folders prefixed with "_" as private (not routable).
 * Original spec suggests /api/super-admin/_diagnostics/razorpay-auth — that private prefix returns 404.
 * Using /api/super-admin/diagnostics/razorpay-auth instead (same SUPER_ADMIN guard, same semantics, routable).
 * Path: /api/super-admin/diagnostics/razorpay-auth
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized — SUPER_ADMIN only" }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";

  if (!keyId || !keySecret) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 500,
        errorCode: "MISSING_CREDENTIALS",
        errorDescription: "Razorpay credentials not configured in production runtime",
        errorReason: null,
        planCount: null,
      },
      { status: 500 },
    );
  }

  try {
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // READ-ONLY — no order/payment/subscription/refund creation
    const result = (await razorpay.plans.all({ count: 1 } as unknown as Record<string, unknown>)) as unknown as {
      entity?: string;
      count?: number;
      items?: unknown[];
    };

    const planCount = typeof result.count === "number" ? result.count : Array.isArray(result.items) ? result.items.length : 0;

    return NextResponse.json(
      {
        success: true,
        statusCode: 200,
        errorCode: null,
        errorDescription: null,
        errorReason: null,
        planCount,
      },
      { status: 200 },
    );
  } catch (raw: unknown) {
    const err = raw as {
      statusCode?: number;
      status?: number;
      error?: { code?: string; description?: string; reason?: string; field?: string; source?: string; step?: string };
      message?: string;
    };

    const statusCode = typeof err.statusCode === "number" ? err.statusCode : typeof err.status === "number" ? err.status : 500;
    const errorCode = err.error?.code ?? null;
    const errorDescription = err.error?.description ?? err.message ?? "unknown error";
    const errorReason = err.error?.reason ?? null;

    return NextResponse.json(
      {
        success: false,
        statusCode,
        errorCode,
        errorDescription,
        errorReason,
        planCount: null,
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed — use POST" }, { status: 405 });
}
