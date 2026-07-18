import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  // Poll for user creation (webhook may take a few seconds)
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

  // Timeout — redirect to login with a hint
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("new", "true");
  loginUrl.searchParams.set("email", email);
  return NextResponse.redirect(loginUrl);
}
