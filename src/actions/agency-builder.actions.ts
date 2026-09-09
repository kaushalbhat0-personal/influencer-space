"use server";

import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertAgencyOwnsTenant, canMutate } from "@/modules/partner/application/authorization";
import {
  encodeAgencyBuilderCookie as encode,
  decodeAgencyBuilderCookie as decode,
  getAgencyBuilderCookieName as getCookieName,
  getAgencyBuilderCookieOptions,
} from "@/lib/agency-builder-cookie";

const COOKIE_NAME = getCookieName();
const COOKIE_TTL = 60 * 60;

export async function getAgencyBuilderTenantId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const payload = decode(raw);
    if (!payload) return null;

    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id;
    const sessionAgencyId = (session?.user as { agencyId?: string })?.agencyId;

    // Bind to session — cookie is selector, never trust alone
    if (!sessionUserId || !sessionAgencyId) return null;
    if (payload.uid !== sessionUserId) return null;
    if (payload.agencyId !== sessionAgencyId) return null;

    // Re-verify ownership on every read — revocation/offboard immediately revokes builder access
    const owned = await assertAgencyOwnsTenant(sessionUserId, sessionAgencyId, payload.tenantId);
    if (!owned.ok) return null;

    // Role still mutates? Preserve canMutate / workspace authorization downstream, but reject revoked staff here as well
    if (!canMutate(session.user.role)) return null;

    return payload.tenantId;
  } catch {
    return null;
  }
}

/**
 * Establish managed client tenant context before entering /builder.
 * Verifies ownership via assertAgencyOwnsTenant, preserves canMutate / requireAgencyActive,
 * and reuses encrypted cookie pattern (selector, not trust boundary).
 */
export async function enterClientBuilder(tenantId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  const role = session?.user?.role;

  if (!userId || !agencyId) return { success: false, error: "Unauthorized" };
  if (!canMutate(role)) return { success: false, error: "Only agency admins can edit client websites" };

  const owned = await assertAgencyOwnsTenant(userId, agencyId, tenantId);
  if (!owned.ok) return { success: false, error: owned.error ?? "Forbidden" };

  // Ensure tenant/website exists — do not establish context for orphan tenant
  const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
  if (!website) return { success: false, error: "No website" };

  // Verify agency workspace is still active (platform lock)
  const { requireAgencyActive } = await import("@/modules/partner/application/authorization");
  const active = await requireAgencyActive();
  if (!active.ok) return { success: false, error: active.error ?? "Agency not active" };

  const value = encode({ tenantId, agencyId, uid: userId });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, value, getAgencyBuilderCookieOptions());
  return { success: true };
}

export async function clearAgencyBuilderContext(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  } catch {
    // best-effort
  }
}

// Test seam — imported from cookie lib where needed; no sync exports from server actions
const __testablesLocal = { COOKIE_NAME, COOKIE_TTL };
