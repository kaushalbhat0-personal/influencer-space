import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  for (let i = 0; i < 30; i++) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true, tenantId: true, agencyId: true },
    });

    if (user) {
      const sessionToken = await encode({
        token: {
          id: user.id,
          name: user.name || user.email.split("@")[0],
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          agencyId: user.agencyId,
        },
        secret: process.env.NEXTAUTH_SECRET!,
      });

      const cookieName =
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token";

      const response = NextResponse.redirect(new URL("/agency", request.url));
      response.cookies.set(cookieName, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 86400,
      });

      return response;
    }

    await sleep(1000);
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("new", "true");
  loginUrl.searchParams.set("email", email);
  return NextResponse.redirect(loginUrl);
}
