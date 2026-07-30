import { NextRequest, NextResponse } from "next/server";
import { encode, getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { resolveWorkspace } from "@/modules/workspace/application/resolve-workspace";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const token = await getToken({ req: request, secret });
    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { id: true, name: true, email: true, role: true, tenantId: true, agencyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (token.role && user.role !== token.role) {
      return NextResponse.json({ error: "Session invalidated: role changed" }, { status: 401 });
    }

    const resolved = await resolveWorkspace(user);

    const sessionToken = await encode({
      token: {
        id: user.id,
        name: user.name || user.email.split("@")[0],
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        agencyId: user.agencyId,
        workspaceId: resolved.workspaceId,
        workspaceType: resolved.workspaceType,
        workspaceRole: resolved.workspaceRole,
      },
      secret,
    });

    const cookieName =
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";

    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    captureError(error, { service: "refresh-session", operation: "POST" });
    return NextResponse.json({ error: "Session refresh failed" }, { status: 500 });
  }
}
