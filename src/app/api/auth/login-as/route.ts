import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { encode } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { WorkspaceCookie } from "@/modules/workspace/infrastructure/cookie";
import { logAction } from "@/lib/audit";

export async function GET() {
  return NextResponse.json({ error: "Method not allowed — use POST" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  // CSRF: require Origin/Referer to match host when present (same-site)
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (host && originHost !== host) {
        return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "CSRF check failed" }, { status: 403 });
    }
  }

  // Require SUPER_ADMIN session to consume the token (prevents stolen-token use by anonymous)
  const callerSession = await getServerSession(authOptions);
  if (!callerSession?.user || callerSession.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let rawToken: string | undefined;
  try {
    const body = (await request.json()) as { token?: string };
    rawToken = body?.token;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!rawToken || typeof rawToken !== "string") {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let type: string;
  let tenantId: string | undefined;
  let agencyId: string | undefined;
  let jti: string | undefined;
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const { payload } = await jwtVerify(rawToken, secret);
    if (payload.type !== "superadmin-impersonation" && payload.type !== "agency-impersonation") {
      throw new Error("Invalid token type");
    }
    type = payload.type as string;
    tenantId = payload.tenantId as string | undefined;
    agencyId = payload.agencyId as string | undefined;
    jti = (payload.jti as string | undefined) || (payload.jti as unknown as string);
    if (!jti) throw new Error("Missing jti");
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // One-time consumption: atomically mark used if not expired and not already used
  try {
    const now = new Date();
    const consumed = await prisma.loginAsToken.updateMany({
      where: { jti, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count === 0) {
      // Check if expired vs already used for accurate message
      const existing = await prisma.loginAsToken.findUnique({ where: { jti } });
      if (!existing) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      if (existing.usedAt) return NextResponse.json({ error: "Token already used" }, { status: 401 });
      if (existing.expiresAt <= now) return NextResponse.json({ error: "Token expired" }, { status: 401 });
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    // Verify stored row matches payload scope
    const row = await prisma.loginAsToken.findUnique({ where: { jti } });
    if (!row || row.type !== type || row.tenantId !== (tenantId ?? null) || row.agencyId !== (agencyId ?? null)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

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
  const response = NextResponse.json({ success: true, redirectTo });
  response.cookies.set(cookieName, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });

  if (targetUser.tenantId) {
    const ws = await workspaceRepository.findByTenantId(targetUser.tenantId);
    if (ws) {
      const member = await workspaceRepository.findMember(ws.id, targetUser.id);
      if (member) {
        response.cookies.set(WorkspaceCookie.cookieName, WorkspaceCookie.encode({ wid: ws.id, role: member.role, type: ws.type, uid: targetUser.id }), WorkspaceCookie.cookieOptions);
      }
    }
  } else if (targetUser.agencyId) {
    const ws = await prisma.workspace.findFirst({ where: { agencyId: targetUser.agencyId } });
    if (ws) {
      const member = await workspaceRepository.findMember(ws.id, targetUser.id);
      if (member) {
        response.cookies.set(WorkspaceCookie.cookieName, WorkspaceCookie.encode({ wid: ws.id, role: member.role, type: ws.type, uid: targetUser.id }), WorkspaceCookie.cookieOptions);
      }
    }
  }

  await logAction("system", `support:impersonated:${type}`, { tenantId, agencyId }).catch(() => {});
  return response;
}
