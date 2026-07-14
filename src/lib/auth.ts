import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const secret = process.env.NEXTAUTH_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  console.warn("WARNING: NEXTAUTH_SECRET is missing in production!");
}

const fallbackSecret =
  "d7f8e9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8";

export const authOptions: NextAuthOptions = {
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
          console.log("Login attempt missing email or password");
          return null;
        }

        if (!credentials?.tenantId) {
          console.log("Login attempt missing tenantId");
          return null;
        }

        console.log("Login attempt for:", credentials.email, "tenant:", credentials.tenantId);

        try {
          const user = await prisma.user.findUnique({
            where: {
              tenantId_email: {
                tenantId: credentials.tenantId,
                email: credentials.email,
              },
            },
          });

          console.log("User found:", !!user);

          if (!user) return null;

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password,
          );

          console.log("Password match:", passwordMatch);

          if (!passwordMatch) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            tenantId: user.tenantId,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: secret || fallbackSecret,
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    },
  },
};
