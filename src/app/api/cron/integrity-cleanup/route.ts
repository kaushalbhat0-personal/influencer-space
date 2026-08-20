import { NextResponse } from "next/server";
import { runSafeCleanup, runIntegrityScan } from "@/lib/integrity/runtime";
import { partnerEngine } from "@/lib/partners/engine";
import { persistedJobRuntime } from "@/modules/operations/application/job-runtime";
import { captureError } from "@/lib/observability/error-tracker";
import { verifyBearerAuth } from "@/lib/security/verify-bearer";

// RCCF-LAUNCH-01: daily integrity + recovery cron (was super-admin-button-only).
// Recovers stuck generation sessions, purges stale terminal sessions and
// expired partner invites, and records the integrity scan for the Ops feed.
export async function GET(request: Request) {
  // RCCF-72.17A (SEC-08): const-time secret compare.
  if (!verifyBearerAuth(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [cleanup, invites, scan] = await Promise.all([
      runSafeCleanup(),
      partnerEngine.expireStaleInvites(),
      runIntegrityScan().catch(() => null),
    ]);

    const detail = [
      `cleared ${cleanup.cleared}`,
      `expired ${invites} invites`,
      scan ? `issues ${scan.totalIssues}` : "scan skipped",
    ].join(" · ");

    await persistedJobRuntime.recordCron("Integrity Cleanup", true, detail);

    return NextResponse.json({
      ok: true,
      cleared: cleanup.cleared,
      details: cleanup.details,
      expiredInvites: invites,
      integrity: scan ? { status: scan.status, totalIssues: scan.totalIssues } : null,
    });
  } catch (error) {
    captureError(error, { service: "integrity-cleanup", operation: "GET" });
    await persistedJobRuntime.recordCron("Integrity Cleanup", false, error instanceof Error ? error.message : "failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
