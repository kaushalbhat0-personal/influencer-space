import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret =
  process.env.NEXTAUTH_SECRET ||
  "d7f8e9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8";

const PLATFORM_DOMAINS = [
  "localhost",
  "influencer-space-alpha.vercel.app",
];

function parseTenantHost(host: string): string | null {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  const stripped = hostname.replace(/^www\./, "");

  if (PLATFORM_DOMAINS.includes(stripped)) {
    return null;
  }

  for (const domain of PLATFORM_DOMAINS) {
    if (stripped.endsWith(`.${domain}`)) {
      return stripped.slice(0, -(domain.length + 1));
    }
  }

  return stripped;
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const tenantHost = parseTenantHost(host);

  const requestHeaders = new Headers(request.headers);
  if (tenantHost) {
    requestHeaders.set("x-tenant-host", tenantHost);
  }

  const pathname = request.nextUrl.pathname;

  if (pathname === "/admin/login") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname.startsWith("/admin")) {
    const token = await getToken({
      req: request,
      secret: secret,
    });

    console.log(
      `Middleware - Path: ${pathname}, Token exists: ${!!token}`,
    );

    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
