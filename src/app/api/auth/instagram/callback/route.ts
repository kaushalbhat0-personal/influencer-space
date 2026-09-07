import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForToken } from "@/lib/social-oauth";
import { logAction } from "@/lib/audit";

/**
 * Instagram OAuth callback — wires existing exchangeCodeForToken("instagram") flow.
 * Read-only audit in RCCF-INTEGRATIONS-05 found this route missing; the
 * encrypted storage and token helpers already existed.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  const role = session?.user?.role;

  // Only creators can connect Instagram — agency/support cannot use tenant integration.
  if (!session?.user?.id || !tenantId) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (role === "AGENCY_ADMIN" || role === "AGENCY_STAFF" || role === "SUPPORT" || role === "READ_ONLY") {
    return NextResponse.redirect(new URL("/admin/integrations?error=forbidden", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    // Provider denied or config error — never log code
    return NextResponse.redirect(
      new URL(`/admin/integrations?instagram=error&reason=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin/integrations?instagram=error&reason=missing_code", request.url));
  }

  // Redirect URI must exactly match the one used in the authorization request.
  // Prefer NEXT_PUBLIC_APP_URL (canonical) else origin from request.
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const redirectUri = `${base.replace(/\/$/, "")}/api/auth/instagram/callback`;

  try {
    await exchangeCodeForToken("instagram", code, redirectUri, tenantId);
    // Avoid logging code or token; audit with sanitized metadata only.
    await logAction(tenantId, "integration:instagram-connected", { provider: "instagram", by: session.user.email ?? session.user.id }).catch(() => {});
    return NextResponse.redirect(new URL("/admin/integrations?instagram=connected", request.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "exchange failed";
    // Never include code or token in redirect or logs; sanitize via audit helper
    await logAction(tenantId, "integration:instagram-connect-failed", { provider: "instagram", error: msg.slice(0, 200) }).catch(() => {});
    return NextResponse.redirect(
      new URL(`/admin/integrations?instagram=error&reason=${encodeURIComponent(msg.slice(0, 200))}`, request.url),
    );
  }
}
