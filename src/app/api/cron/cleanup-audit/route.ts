import { NextResponse } from "next/server";
import { purgeOldAuditLogs } from "@/lib/audit";
import { persistedJobRuntime } from "@/modules/operations/application/job-runtime";
import { verifyBearerAuth } from "@/lib/security/verify-bearer";

// RCCF-72.17A (SEC-08): const-time secret compare + days clamping. A negative
// or absurd `days` value would delete the entire audit trail.
const MAX_PURGE_DAYS = 3650;

export async function GET(request: Request) {
  if (!verifyBearerAuth(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const rawDays = url.searchParams.get("days") ?? "90";
  const parsedDays = Number.parseInt(rawDays, 10);
  const days = Number.isNaN(parsedDays) ? 90 : Math.min(Math.max(parsedDays, 1), MAX_PURGE_DAYS);

  try {
    const result = await purgeOldAuditLogs(days);
    await persistedJobRuntime.recordCron("Cleanup Old Audit Logs", true, `${result.deleted} deleted`);
    return NextResponse.json({ ok: true, deleted: result.deleted, olderThanDays: days });
  } catch (error) {
    await persistedJobRuntime.recordCron("Cleanup Old Audit Logs", false, error instanceof Error ? error.message : "failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
