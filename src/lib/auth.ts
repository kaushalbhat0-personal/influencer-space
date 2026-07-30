import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveWorkspace } from "@/modules/workspace/application/resolve-workspace";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import { metricsService } from "@/lib/observability/metrics-service";

const secret = process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  throw new Error("NEXTAUTH_SECRET is required in production");
}

export const authOptions: NextAuthOptions = {
  secret: secret ?? undefined,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantId: { label: "Tenant ID", type: "text" },
      },
      async authorize(credentials) {
        logger.info("Login attempt", "auth", { operation: "authorize", metadata: { email: credentials?.email } as Record<string, unknown> });
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const user = await prisma.user.findFirst({
            where: { email: credentials.email },
            include: { tenant: { select: { id: true, subdomain: true } } },
          });
          if (!user) {
            logger.info("Login failed: user not found", "auth", { operation: "authorize", metadata: { email: credentials.email } as Record<string, unknown> });
            metricsService.recordOutcome("publish", false);
            return null;
          }

          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          if (!passwordMatch) {
            logger.info("Login failed: invalid password", "auth", { operation: "authorize", metadata: { email: credentials.email } as Record<string, unknown> });
            metricsService.recordOutcome("publish", false);
            return null;
          }

          if (user.role === "SUPER_ADMIN") {
            logger.info("Login successful", "auth", { operation: "authorize", metadata: { email: credentials.email, role: user.role } as Record<string, unknown> });
            metricsService.recordOutcome("publish", true);
            return { id: user.id, email: user.email, name: user.name, tenantId: null, agencyId: null, role: user.role, workspaceId: null, workspaceType: null, workspaceRole: null };
          }

          if (user.role === "AGENCY_ADMIN" || user.role === "AGENCY_STAFF") {
            logger.info("Login successful", "auth", { operation: "authorize", metadata: { email: credentials.email, role: user.role } as Record<string, unknown> });
            metricsService.recordOutcome("publish", true);
            return { id: user.id, email: user.email, name: user.name, tenantId: null, agencyId: user.agencyId, role: user.role };
          }

          if (user.role === "ADMIN") {
            if (credentials.tenantId && user.tenant) {
              const match = user.tenant.id === credentials.tenantId || user.tenant.subdomain === credentials.tenantId;
              if (!match) {
                logger.info("Login failed: tenant mismatch", "auth", { operation: "authorize", metadata: { email: credentials.email } as Record<string, unknown> });
                metricsService.recordOutcome("publish", false);
                return null;
              }
            }
            logger.info("Login successful", "auth", { operation: "authorize", metadata: { email: credentials.email, role: user.role } as Record<string, unknown> });
            metricsService.recordOutcome("publish", true);
            return { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId, agencyId: user.agencyId, role: user.role };
          }

          logger.info("Login failed: unknown role", "auth", { operation: "authorize", metadata: { email: credentials.email, role: user.role } as Record<string, unknown> });
          metricsService.recordOutcome("publish", false);
          return null;
        } catch (error) {
          captureError(error, { service: "auth", operation: "authorize" });
          return null;
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  jwt: { maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/admin/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.agencyId = user.agencyId;
        token.role = user.role;
        if (user.workspaceId) {
          token.workspaceId = user.workspaceId;
          token.workspaceType = user.workspaceType;
          token.workspaceRole = user.workspaceRole;
        } else {
          const resolved = await resolveWorkspace(user);
          token.workspaceId = resolved.workspaceId;
          token.workspaceType = resolved.workspaceType;
          token.workspaceRole = resolved.workspaceRole;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, role: true },
        });
        if (!dbUser || dbUser.role !== token.role) {
          logger.warn("Session invalidated: user deleted or role changed", "auth", {
            metadata: { userId: token.id, tokenRole: token.role } as Record<string, unknown>,
          });
          return { ...session, expires: new Date(0).toISOString() };
        }
        session.user.id = token.id as string;
        session.user.tenantId = (token.tenantId as string) ?? null;
        session.user.agencyId = (token.agencyId as string) ?? null;
        session.user.role = token.role as "SUPER_ADMIN" | "ADMIN" | "AGENCY_ADMIN" | "AGENCY_STAFF";
        session.user.workspaceId = (token.workspaceId as string) ?? null;
        session.user.workspaceType = (token.workspaceType as string) ?? null;
        session.user.workspaceRole = (token.workspaceRole as string) ?? null;
      }
      return session;
    },
  },
};
