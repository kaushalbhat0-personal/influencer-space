import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Initiates Instagram OAuth — redirects to Instagram authorize.
 * Keeps client_id server-side, never logs tokens.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  const role = session?.user?.role;

  if (!session?.user?.id || !tenantId) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (role === "AGENCY_ADMIN" || role === "AGENCY_STAFF" || role === "SUPPORT" || role === "READ_ONLY") {
    return NextResponse.redirect(new URL("/admin/integrations?error=forbidden", request.url));
  }

  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL("/admin/integrations?instagram=error&reason=oauth_not_configured", request.url));
  }

  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const redirectUri = `${base.replace(/\/$/, "")}/api/auth/instagram/callback`;

  const authorizeUrl = new URL("https://api.instagram.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "user_profile,user_media");
  authorizeUrl.searchParams.set("response_type", "code");
  // Use tenantId as state basic CSRF; callback validates session tenant anyway
  authorizeUrl.searchParams.set("state", tenantId);

  return NextResponse.redirect(authorizeUrl.toString());
}
