// ── Role Guards — Creator-or-Super-Admin boundary ────────────
// RCCF-72.18D.5.2-A. Shared action-layer authorization for creator order/
// fulfillment operations. Mirrors the canonical requireCreatorOrSuperAdmin
// pattern from src/actions/payment-account.actions.ts (RCCF-72.18D) — no new
// authorization framework: same session source, same role allowlist.
//
// ALLOW: ADMIN (tenant-bound creator), SUPER_ADMIN (intentional cross-tenant).
// DENY:  AGENCY_ADMIN, AGENCY_STAFF, SUPPORT, READ_ONLY, anonymous.

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface CreatorGuardContext {
  tenantId?: string;
  isSuper: boolean;
  actor?: string;
}

export async function requireCreatorOrSuperAdminSession(): Promise<CreatorGuardContext | null> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!session?.user?.id) return null;
  // Explicitly deny agency and support/view-only roles at the action boundary.
  if (role === "AGENCY_ADMIN" || role === "AGENCY_STAFF" || role === "SUPPORT" || role === "READ_ONLY") {
    return null;
  }
  const isSuper = role === "SUPER_ADMIN";
  const tenantId = session?.user?.tenantId ?? undefined;
  if (!isSuper && !tenantId) return null;
  return { tenantId, isSuper, actor: session.user.email ?? undefined };
}
