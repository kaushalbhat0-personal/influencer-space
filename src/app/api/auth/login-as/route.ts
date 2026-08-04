import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { WorkspaceCookie } from "@/modules/workspace/infrastructure/cookie";
import { logAction } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const rawToken = request.nextUrl.searchParams.get("token");
  if (!rawToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let type: string;
  let tenantId: string | undefined;
  let agencyId: string | undefined;
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(rawToken, secret);
    if (payload.type !== "superadmin-impersonation" && payload.type !== "agency-impersonation") {
      throw new Error("Invalid token type");
    }
    type = payload.type as string;
    tenantId = payload.tenantId as string | undefined;
    agencyId = payload.agencyId as string | undefined;
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // IMPLEMENTATION-41: support tenant-ADMIN impersonation (existing) AND
  // agency impersonation (AGENCY_ADMIN of the target agency).
  let targetUser;
  if (type === "agency-impersonation") {
    targetUser = agencyId
      ? await prisma.user.findFirst({ where: { agencyId, role: "AGENCY_ADMIN" } })
      : null;
  } else {
    targetUser = tenantId
      ? await prisma.user.findFirst({ where: { tenantId, role: "ADMIN" } })
      : null;
  }
  if (!targetUser) {
    return NextResponse.json({ error: "No target user found" }, { status: 404 });
  }

  const sessionToken = await encode({
    token: {
      id: targetUser.id,
      name: targetUser.name || "User",
      email: targetUser.email,
      role: targetUser.role,
      tenantId: targetUser.tenantId,
      agencyId: targetUser.agencyId,
    },
    secret: process.env.NEXTAUTH_SECRET!,
  });

  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

  const redirectTo = type === "agency-impersonation" ? "/agency" : "/admin/dashboard";
  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });

  // Set workspace cookie for the target user's workspace.
  if (targetUser.tenantId) {
    const ws = await workspaceRepository.findByTenantId(targetUser.tenantId);
    if (ws) {
      const member = await workspaceRepository.findMember(ws.id, targetUser.id);
      if (member) {
        response.cookies.set(WorkspaceCookie.cookieName, WorkspaceCookie.encode({ wid: ws.id, role: member.role, type: ws.type }), WorkspaceCookie.cookieOptions);
      }
    }
  } else if (targetUser.agencyId) {
    const ws = await prisma.workspace.findFirst({ where: { agencyId: targetUser.agencyId } });
    if (ws) {
      const member = await workspaceRepository.findMember(ws.id, targetUser.id);
      if (member) {
        response.cookies.set(WorkspaceCookie.cookieName, WorkspaceCookie.encode({ wid: ws.id, role: member.role, type: ws.type }), WorkspaceCookie.cookieOptions);
      }
    }
  }

  await logAction("system", `support:impersonated:${type}`, { tenantId, agencyId, actorToken: "superadmin" }).catch(() => {});
  return response;
}
