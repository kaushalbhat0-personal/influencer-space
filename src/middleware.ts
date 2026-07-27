import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { LifecycleService } from "@/lib/lifecycle/token-resolver";

const lifecycleService = new LifecycleService();

const secret = process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("NEXTAUTH_SECRET is required in production");
}

const platformDomains = [
  "localhost:3000",
  "influencer-space-alpha.vercel.app",
];

const DEFAULT_TENANT = process.env.DEFAULT_TENANT_SUBDOMAIN || "";

const PUBLIC_PATHS = ["/", "/pricing", "/features", "/signup", "/admin/login"];

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

// ─── Main Middleware ──────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  const token = await getToken({ req: request, secret }) as {
    id?: string; tenantId?: string; role?: string; workspaceId?: string;
  } | null;
  const lifecycle = lifecycleService.resolveFromToken(token);
  const workspaceId = token?.workspaceId;

  // ── Public paths (always allowed) ──────────────────────────────────────────
  if (PUBLIC_PATHS.includes(pathname)) {
    const headers = new Headers(request.headers);
    if (workspaceId) headers.set("x-workspace-id", workspaceId);
    return NextResponse.next({ request: { headers } });
  }

  // ── Platform root ──────────────────────────────────────────────────────────
  if (platformDomains.some((d) => d === host.toLowerCase())) {
    const redirect = lifecycleService.redirectTo(pathname, lifecycle);
    if (redirect) {
      const url = new URL(redirect, request.url);
      return NextResponse.redirect(url);
    }

    const canAccess = lifecycleService.canAccess(pathname, lifecycle);
    if (!canAccess.allowed) {
      const url = new URL(canAccess.redirectTo ?? "/admin/login", request.url);
      return NextResponse.redirect(url);
    }

    const headers = new Headers(request.headers);
    if (workspaceId) headers.set("x-workspace-id", workspaceId);
    return NextResponse.next({ request: { headers } });
  }

  // ── Tenant subdomain ───────────────────────────────────────────────────────
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

  // Role-based access for admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/super-admin")) {
    const redirect = lifecycleService.redirectTo(pathname, lifecycle);
    if (redirect) {
      const url = new URL(redirect, request.url);
      return NextResponse.redirect(url);
    }

    const canAccess = lifecycleService.canAccess(pathname, lifecycle);
    if (!canAccess.allowed) {
      const url = new URL(canAccess.redirectTo ?? "/admin/login", request.url);
      return NextResponse.redirect(url);
    }

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
