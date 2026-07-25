import { computeDateRange, type DatePreset, type DateRange } from "./date";
import { computeAnalytics as runQueries } from "./queries";
import { verifyTenantAccess } from "./permissions";
import { validateDatePreset, validateTenantId } from "./validation";
import type { AnalyticsSummary } from "./types";
import type { Session } from "next-auth";

export interface AnalyticsResult {
  success: true;
  data: AnalyticsSummary;
}

export interface AnalyticsError {
  success: false;
  error: string;
}

export type AnalyticsResponse = AnalyticsResult | AnalyticsError;

export async function fetchAnalytics(
  session: Session | null,
  tenantId: string,
  preset: DatePreset = "last_30_days",
): Promise<AnalyticsResponse> {
  const authError = verifyTenantAccess(session, tenantId);
  if (authError) return { success: false, error: authError };

  if (!validateTenantId(tenantId)) return { success: false, error: "Invalid tenant ID" };

  const validatedPreset = validateDatePreset(preset) ?? "last_30_days";
  const range = computeDateRange(validatedPreset);
  const data = await runQueries(tenantId, range);

  return { success: true, data };
}

export async function fetchAnalyticsForRange(
  session: Session | null,
  tenantId: string,
  customRange: DateRange,
): Promise<AnalyticsResponse> {
  const authError = verifyTenantAccess(session, tenantId);
  if (authError) return { success: false, error: authError };
  if (!validateTenantId(tenantId)) return { success: false, error: "Invalid tenant ID" };

  const data = await runQueries(tenantId, customRange);
  return { success: true, data };
}
