import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    tenantId: string | null;
    role: "SUPER_ADMIN" | "ADMIN";
  }

  interface Session {
    user: {
      id: string;
      tenantId: string | null;
      role: "SUPER_ADMIN" | "ADMIN";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    tenantId: string | null;
    role: "SUPER_ADMIN" | "ADMIN";
  }
}
