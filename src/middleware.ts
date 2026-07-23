import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("NEXTAUTH_SECRET is required in production");
}

const platformDomains = [
  "localhost:3000",
  "influencer-space-alpha.vercel.app",
];

const DEFAULT_TENANT = process.env.DEFAULT_TENANT_SUBDOMAIN || "";

// ─── Tenant Host Resolution ──────────────────────────────────────────────────

function parseTenantHost(host: string): string | null {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const stripped = hostname.replace(/^www\./, "");

  if (platformDomains.some((d) => d === host.toLowerCase() || stripped === d.split(":")[0])) {
    return null;
  }

  for (const domain of platformDomains) {
    const domainHost = domain.split(":")[0];
    if (stripped.endsWith(`.${domainHost}`)) {
      return stripped.slice(0, -(domainHost.length + 1));
    }
  }

  return stripped;
}

// ─── Role-Based Route Guards ─────────────────────────────────────────────────

type AllowedRole = "SUPER_ADMIN" | "AGENCY_ADMIN" | "AGENCY_STAFF" | "ADMIN";

const routeGuards: Array<{
  prefix: string;
  roles: AllowedRole[];
  redirectTo: string;
}> = [
  { prefix: "/super-admin", roles: ["SUPER_ADMIN"], redirectTo: "/admin/login" },
  { prefix: "/agency",       roles: ["SUPER_ADMIN", "AGENCY_ADMIN", "AGENCY_STAFF"], redirectTo: "/admin/login" },
  { prefix: "/admin/dashboard", roles: ["SUPER_ADMIN", "AGENCY_ADMIN", "AGENCY_STAFF", "ADMIN"], redirectTo: "/admin/login" },
  { prefix: "/admin",        roles: ["SUPER_ADMIN", "AGENCY_ADMIN", "AGENCY_STAFF", "ADMIN"], redirectTo: "/admin/login" },
];

async function checkRouteAccess(
  pathname: string,
  request: NextRequest,
): Promise<NextResponse | null> {
  const guard = routeGuards.find((g) => pathname.startsWith(g.prefix));
  if (!guard) return null;

  // Allow login page through
  if (pathname === "/admin/login") return null;

  const token = await getToken({ req: request, secret });

  if (!token) {
    const loginUrl = new URL(guard.redirectTo, request.url);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = token.role as AllowedRole | undefined;

  if (!userRole || !guard.roles.includes(userRole)) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  return null; // Access allowed
}

// ─── Main Middleware ──────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Read workspaceId from JWT token (available in all roles)
  const token = await getToken({ req: request, secret }).catch(() => null);
  const workspaceId = (token?.workspaceId as string) ?? null;

  // Platform root — bypass tenant logic
  if (platformDomains.some((d) => d === host.toLowerCase())) {
    const accessCheck = await checkRouteAccess(pathname, request);
    if (accessCheck) return accessCheck;
    const headers = new Headers(request.headers);
    if (workspaceId) headers.set("x-workspace-id", workspaceId);
    return NextResponse.next({ request: { headers } });
  }

  const tenantHost = parseTenantHost(host) || DEFAULT_TENANT || null;

  const requestHeaders = new Headers(request.headers);
  if (tenantHost) {
    requestHeaders.set("x-tenant-host", tenantHost);
  }

  // Redirect /agency/* to /workspace/* (Phase 1: compatibility redirect)
  if (pathname.startsWith("/agency")) {
    const newPath = pathname.replace("/agency", "/workspace");
    const url = new URL(newPath, request.url);
    return NextResponse.redirect(url, { status: 308 });
  }

  // Check role-based access for admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/super-admin")) {
    const accessCheck = await checkRouteAccess(pathname, request);
    if (accessCheck) return accessCheck;
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Tenant rewrite for public pages
  if (tenantHost && !pathname.startsWith("/_next") && !pathname.startsWith("/api")) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] !== tenantHost) {
      const url = new URL(`/${tenantHost}${pathname}`, request.url);
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
