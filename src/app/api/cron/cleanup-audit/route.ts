import { NextResponse } from "next/server";
import { purgeOldAuditLogs } from "@/lib/audit";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "90");

  const result = await purgeOldAuditLogs(days);

  return NextResponse.json({ ok: true, deleted: result.deleted, olderThanDays: days });
}
