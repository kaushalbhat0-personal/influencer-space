import { NextResponse } from "next/server";
import { purgeOldAuditLogs } from "@/lib/audit";
import { persistedJobRuntime } from "@/modules/operations/application/job-runtime";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "90");

  try {
    const result = await purgeOldAuditLogs(days);
    await persistedJobRuntime.recordCron("Cleanup Old Audit Logs", true, `${result.deleted} deleted`);
    return NextResponse.json({ ok: true, deleted: result.deleted, olderThanDays: days });
  } catch (error) {
    await persistedJobRuntime.recordCron("Cleanup Old Audit Logs", false, error instanceof Error ? error.message : "failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
