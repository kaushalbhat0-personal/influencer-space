import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * RCCF-LIVE-SMOKE-12 — TEMPORARY PRODUCTION RAZORPAY DIAGNOSTIC (re-verify after credential update)
 * SUPER_ADMIN-gated, POST-only, server-only.
 * Safely reports credential configuration (prefix/length/match) without exposing secrets,
 * verifies TEST credentials not in Production, checks smoke mode, and performs ONE read-only
 * razorpay.plans.all({count:1}) call.
 * NEVER returns or logs keyId/keySecret.
 * TEMPORARY — remove immediately after single SUPER_ADMIN call.
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized — SUPER_ADMIN only" }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const pubKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
  const testKeyIdProd = process.env.TEST_RAZORPAY_KEY_ID ?? "";
  const testSecretProd = process.env.TEST_RAZORPAY_KEY_SECRET ?? "";

  const safePrefix = (v: string) => (v ? v.slice(0, 8) : null);
  const config = {
    razorpayKeyIdPresent: !!keyId,
    razorpayKeySecretPresent: !!keySecret,
    nextPublicKeyIdPresent: !!pubKeyId,
    razorpayKeyIdPrefix: safePrefix(keyId),
    razorpayKeyIdLength: keyId ? keyId.length : 0,
    nextPublicKeyIdPrefix: safePrefix(pubKeyId),
    nextPublicKeyIdLength: pubKeyId ? pubKeyId.length : 0,
    serverPublicMatch: !!keyId && !!pubKeyId && keyId === pubKeyId,
    testKeyIdProductionPresent: !!testKeyIdProd,
    testKeySecretProductionPresent: !!testSecretProd,
  };

  let smokeDisabled = true;
  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.liveSmokeTestConfig.findUnique({ where: { id: "live-smoke-test" }, select: { enabled: true } });
    smokeDisabled = !(row?.enabled ?? false);
  } catch {
    smokeDisabled = true;
  }

  if (!keyId || !keySecret) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 500,
        errorCode: "MISSING_CREDENTIALS",
        errorDescription: "Razorpay credentials not configured in production runtime",
        errorReason: null,
        planCount: null,
        config,
        smokeDisabled,
      },
      { status: 500 },
    );
  }

  try {
    const Razorpay = (await import("razorpay")).default;
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const result = (await razorpay.plans.all({ count: 1 } as unknown as Record<string, unknown>)) as unknown as {
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
        config,
        smokeDisabled,
      },
      { status: 200 },
    );
  } catch (raw: unknown) {
    const err = raw as {
      statusCode?: number;
      status?: number;
      error?: { code?: string; description?: string; reason?: string };
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
        config,
        smokeDisabled,
      },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed — use POST" }, { status: 405 });
}
