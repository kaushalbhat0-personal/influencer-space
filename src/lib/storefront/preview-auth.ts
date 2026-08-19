import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * RCCF-72.9 — preview authorization boundary.
 *
 * The public storefront serves the persisted PublishedSnapshot to everyone, but
 * the `?preview=true` branch reconstructs the CURRENT DRAFT (layout + live CMS
 * content) which must never be visible to anonymous visitors or to other
 * tenants. A viewer may preview a tenant's draft only when their authenticated
 * session belongs to that tenant.
 *
 * This is the canonical, server-side predicate for preview authorization:
 *   anonymous / expired session  -> false
 *   session tenant != target     -> false (cross-tenant denied)
 *   session tenant == target     -> true
 *
 * It is deliberately NOT a route redirect (unlike `requireTenant`) — the
 * storefront must keep serving the public snapshot when preview is not
 * authorized, never bounce a public visitor to a login wall.
 */
export async function canPreviewTenant(tenantId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return session?.user?.tenantId != null && session.user.tenantId === tenantId;
}
