"use server";

import { fetchAnalytics as serviceFetchAnalytics } from "@/lib/analytics/service";
import type { DatePreset } from "@/lib/analytics/date";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function fetchAnalytics(tenantId: string, preset: DatePreset = "last_30_days") {
  const session = await getServerSession(authOptions);
  return serviceFetchAnalytics(session, tenantId, preset);
}

export type AnalyticsResponse = Awaited<ReturnType<typeof fetchAnalytics>>;
