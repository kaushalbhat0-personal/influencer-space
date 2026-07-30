import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { LifecycleService } from "@/lib/lifecycle/token-resolver";
import { classifyRoute, requiresAuthentication } from "@/lib/platform/routes";

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

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;
  const classification = classifyRoute(pathname);

  // ── Phase 1: Always-allow routes (static, internal, public marketing, public storefront) ──────
  // These never require authentication regardless of session state.
  if (!requiresAuthentication(classification.category)) {
    const headers = new Headers(request.headers);
    const token = await getToken({ req: request, secret }) as {
      id?: string; tenantId?: string; role?: string; workspaceId?: string;
    } | null;
    const workspaceId = token?.workspaceId;
    if (workspaceId) headers.set("x-workspace-id", workspaceId);

    // Tenant subdomain → rewrite to /[slug] for storefront page
    const tenantHost = parseTenantHost(host) || DEFAULT_TENANT || null;
    if (tenantHost) {
      headers.set("x-tenant-host", tenantHost);
      const segments = pathname.split("/").filter(Boolean);
      if (segments.length === 0 || segments[0] !== tenantHost) {
        const url = new URL(`/${tenantHost}${pathname}`, request.url);
        return NextResponse.rewrite(url);
      }
    }

    if (classification.slug) headers.set("x-tenant-host", classification.slug);
    return NextResponse.next({ request: { headers } });
  }

  // ── Phase 2: Protected routes — authenticate first, then authorize ───────────────────────────
  const token = await getToken({ req: request, secret }) as {
    id?: string; tenantId?: string; role?: string; workspaceId?: string;
  } | null;
  const lifecycle = lifecycleService.resolveFromToken(token);
  const workspaceId = token?.workspaceId;
  const requestHeaders = new Headers(request.headers);
  if (workspaceId) requestHeaders.set("x-workspace-id", workspaceId);

  // Compatibility: /agency/* → /workspace/*
  if (pathname.startsWith("/agency")) {
    const newPath = pathname.replace("/agency", "/workspace");
    const url = new URL(newPath, request.url);
    return NextResponse.redirect(url, { status: 308 });
  }

  // Role-based redirects for authenticated users
  const redirect = lifecycleService.redirectTo(pathname, lifecycle);
  if (redirect) {
    const url = new URL(redirect, request.url);
    return NextResponse.redirect(url);
  }

  // Access control
  const canAccess = lifecycleService.canAccess(pathname, lifecycle);
  if (!canAccess.allowed) {
    const url = new URL(canAccess.redirectTo ?? "/admin/login", request.url);
    return NextResponse.redirect(url);
  }

  // Security headers for protected responses
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
