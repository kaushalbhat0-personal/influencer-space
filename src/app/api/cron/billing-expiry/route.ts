import { NextResponse } from "next/server";
import { verifyBearerAuth } from "@/lib/security/verify-bearer";
import { persistedJobRuntime } from "@/modules/operations/application/job-runtime";
import { captureError } from "@/lib/observability/error-tracker";
import { runBillingExpiry } from "@/modules/billing/application/billing-expiry";

export async function GET(request: Request) {
  if (!verifyBearerAuth(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runBillingExpiry(new Date());
    await persistedJobRuntime.recordCron("Billing Expiry", true, `expired ${result.expired} / ${result.totalPastDue} past-due`);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    captureError(error, { service: "billing-expiry", operation: "GET" });
    await persistedJobRuntime.recordCron("Billing Expiry", false, error instanceof Error ? error.message : "failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
