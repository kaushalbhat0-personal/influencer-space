import { NextResponse } from "next/server";
import { verifyBearerAuth } from "@/lib/security/verify-bearer";
import { persistedJobRuntime } from "@/modules/operations/application/job-runtime";
import { captureError } from "@/lib/observability/error-tracker";
import { runReconciliationBatch } from "@/modules/billing/application/reconciliation-runner";

export async function GET(request: Request) {
  if (!verifyBearerAuth(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const batch = Math.min(50, Math.max(1, Number(url.searchParams.get("batch") ?? 20)));
    const result = await runReconciliationBatch(new Date(), batch);
    await persistedJobRuntime.recordCron(
      "Billing Reconciliation",
      result.failed === 0,
      `repaired ${result.repaired}/${result.total} failed=${result.failed}`,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    captureError(error, { service: "reconciliation", operation: "GET" });
    await persistedJobRuntime.recordCron("Billing Reconciliation", false, error instanceof Error ? error.message : "failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
