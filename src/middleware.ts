import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { LifecycleService } from "@/lib/lifecycle/token-resolver";
import { classifyRoute, requiresAuthentication } from "@/lib/platform/routes";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { getPlatformDomains } from "@/lib/platform/domains";

const lifecycleService = new LifecycleService();

const secret = process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("NEXTAUTH_SECRET is required in production");
}

/** Loopback / localhost callers are the developer machine — never rate-limited. */
function isLoopbackIp(ip: string): boolean {
  const first = ip.split(",")[0].trim();
  return (
    first === "::1" ||
    first === "127.0.0.1" ||
    first === "localhost" ||
    first.startsWith("127.") ||
    first.startsWith("0:0:0:0:0:0:0:1") ||
    first === "::ffff:127.0.0.1" ||
    first.startsWith("::ffff:127.")
  );
}

/**
 * Platform domains (marketing/admin/builder) vs tenant subdomains.
 *
 * Any host NOT in this list is treated as a tenant host and rewritten to the
 * storefront route. The list is derived from the deployment environment so the
 * actual deployment domain is always recognized as a platform domain — a
 * hardcoded list that omits the real domain rewrites the platform host as a
 * tenant host, which produces a 404 on every storefront URL while
 * /admin and /builder keep working.
 */

const platformDomains = getPlatformDomains();

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

  // Rate limit auth endpoints. VALIDATION-01 V-017: only credential attempts
  // are rate-limited here — the NextAuth session/csrf pollers and sign-out must
  // never count against the login bucket (prevents self-lockout). Registration
  // is rate-limited inside its own route (V-016 — not double-counted).
  if (pathname === "/api/auth/callback/credentials" || pathname === "/api/auth/signin") {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    // RCCF-72.17C.1: loopback/local development traffic (the developer machine,
    // local E2E/Playwright runs) is exempt from the auth rate limit. The limit
    // exists to throttle external credential-stuffing; a local caller cannot be
    // an attacker at this layer (the request is not yet authenticated, so a
    // "super admin" exemption is not determinable here). Production external
    // IPs remain rate-limited.
    if (!isLoopbackIp(ip)) {
      const rate = checkRateLimit(`/api/auth/login:${ip}`, "/api/auth/login");
      if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  // ── Phase 1: Always-allow routes (static, internal, public marketing, public storefront, login) ──
  // These never require authentication regardless of session state.
  const isLoginPage = pathname === "/admin/login";
  if (!requiresAuthentication(classification.category) || isLoginPage) {
    const headers = new Headers(request.headers);
    const token = await getToken({ req: request, secret }) as {
      id?: string; tenantId?: string; role?: string; workspaceId?: string;
    } | null;
    const workspaceId = token?.workspaceId;
    if (workspaceId) headers.set("x-workspace-id", workspaceId);

    // Tenant subdomain → rewrite to /[slug] for storefront page.
    // Only applies when:
    //   a) Request arrives on a custom tenant subdomain (e.g. owais.creatorspace.app)
    //   b) Path is a storefront slug on the platform domain
    // Storefront slugs (e.g. /farah-khan) are handled natively by the [domain]
    // route and carry an x-tenant-host header; admin/api/builder/marketing
    // routes are never rewritten. A DEFAULT_TENANT dev fallback is intentionally
    // NOT used here — rewriting every non-admin path (e.g. to /snax/admin/login)
    // 404s the entire dashboard and API in development.
    // RCCF-69.4 (P1-B) — server-authoritative tenant header lifecycle.
    //
    // `x-tenant-host` must NEVER be an inbound client-selected authority. It is
    // set here ONLY from trusted request properties (the real Host header via
    // parseTenantHost, or the storefront slug resolved from the route). When no
    // tenant can be derived, the header is REMOVED — a client-supplied value is
    // never preserved into a server action, so getTenantContext() can never be
    // steered to an arbitrary tenant by a crafted header.
    const extractedTenant = parseTenantHost(host);
    if (extractedTenant) {
      headers.set("x-tenant-host", extractedTenant);
      const LEGAL_PATHS = ["/terms", "/privacy", "/refund", "/disclaimer"];
      const segments = pathname.split("/").filter(Boolean);
      const isLegal = LEGAL_PATHS.includes(pathname);
      if (isLegal) {
        const url = new URL(`/${extractedTenant}${pathname}`, request.url);
        return NextResponse.rewrite(url);
      }
      // VALIDATION-01 V-032: platform legal pages must not be rewritten to the
      // tenant storefront route (which would 404 them) when on platform host.
      // On a tenant host (custom domain) legal IS tenant-owned and must rewrite.
      if (!LEGAL_PATHS.includes(pathname) && (segments.length === 0 || segments[0] !== extractedTenant)) {
        const url = new URL(`/${extractedTenant}${pathname}`, request.url);
        return NextResponse.rewrite(url);
      }
    }

    if (classification.slug) {
      headers.set("x-tenant-host", classification.slug);
    } else if (!extractedTenant) {
      headers.delete("x-tenant-host");
    }
    // RCCF-72.17A (SEC-05): an authorized draft preview (?preview=true) must
    // NEVER be cached/shared as a public response. Without this override the
    // `Cache-Control: public, … s-maxage=60` header set for `/:slug` in
    // next.config would let the edge cache a tenant's draft for up to 60s and
    // serve it to anonymous visitors, leaking unpublished content.
    const previewResponse = NextResponse.next({ request: { headers } });
    if (request.nextUrl.searchParams.get("preview") === "true") {
      previewResponse.headers.set("Cache-Control", "private, no-store");
    }
    return previewResponse;
  }

  // ── Phase 2: Protected routes — authenticate first, then authorize ───────────────────────────
  const token = await getToken({ req: request, secret }) as {
    id?: string; tenantId?: string; role?: string; workspaceId?: string;
  } | null;
  const lifecycle = lifecycleService.resolveFromToken(token);
  const workspaceId = token?.workspaceId;
  const requestHeaders = new Headers(request.headers);
  if (workspaceId) requestHeaders.set("x-workspace-id", workspaceId);

  // CRITICAL-02 (audit): the old `/agency/* → /workspace/*` compatibility 308
  // redirected every real agency route to a nonexistent `/workspace`, making the
  // entire agency console 404. The agency console lives at `/agency/**`; removed.
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
