import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { workspaceRepository } from "@/lib/workspace/repository";
import { WorkspaceCookie } from "@/lib/workspace/cookie";

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token");
  if (!rawToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let tenantId: string;
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(rawToken, secret);
    if (payload.type !== "superadmin-impersonation") {
      throw new Error("Invalid token type");
    }
    tenantId = payload.tenantId as string;
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const adminUser = await prisma.user.findFirst({
    where: { tenantId, role: "ADMIN" },
  });
  if (!adminUser) {
    return NextResponse.json({ error: "No admin user found for this tenant" }, { status: 404 });
  }

  const sessionToken = await encode({
    token: {
      id: adminUser.id,
      name: adminUser.name || "Admin",
      email: adminUser.email,
      role: adminUser.role,
      tenantId: adminUser.tenantId,
      agencyId: adminUser.agencyId,
    },
    secret: process.env.NEXTAUTH_SECRET!,
  });

  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

  const response = NextResponse.redirect(new URL("/admin/dashboard", request.url));
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });

  // Set workspace cookie
  if (adminUser.tenantId) {
    const ws = await workspaceRepository.findByTenantId(adminUser.tenantId);
    if (ws) {
      const member = await workspaceRepository.findMember(ws.id, adminUser.id);
      if (member) {
        const wsCookie = WorkspaceCookie.encode({
          wid: ws.id,
          role: member.role,
          type: ws.type,
        });
        response.cookies.set(WorkspaceCookie.cookieName, wsCookie, WorkspaceCookie.cookieOptions);
      }
    }
  }

  return response;
}
