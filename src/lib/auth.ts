import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findFirst({
            where: { email: credentials.email },
            include: { tenant: { select: { id: true, subdomain: true } } },
          });

          if (!user) return null;

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password,
          );

          if (!passwordMatch) return null;

          if (user.role === "SUPER_ADMIN") {
            return { id: user.id, email: user.email, name: user.name, tenantId: null, agencyId: null, role: user.role };
          }

          if (user.role === "AGENCY_ADMIN" || user.role === "AGENCY_STAFF") {
            return { id: user.id, email: user.email, name: user.name, tenantId: null, agencyId: user.agencyId, role: user.role };
          }

          if (user.role === "ADMIN") {
            if (credentials.tenantId && user.tenant) {
              const match = user.tenant.id === credentials.tenantId || user.tenant.subdomain === credentials.tenantId;
              if (!match) return null;
            }
            return { id: user.id, email: user.email, name: user.name, tenantId: user.tenantId, agencyId: user.agencyId, role: user.role };
          }

          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
        token.agencyId = user.agencyId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = (token.tenantId as string) ?? null;
        session.user.agencyId = (token.agencyId as string) ?? null;
        session.user.role = token.role as "SUPER_ADMIN" | "ADMIN" | "AGENCY_ADMIN" | "AGENCY_STAFF";
      }
      return session;
    },
  },
};
