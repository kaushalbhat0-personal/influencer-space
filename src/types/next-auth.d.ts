import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    tenantId: string | null;
    agencyId?: string | null;
    role: "SUPER_ADMIN" | "ADMIN" | "AGENCY_ADMIN" | "AGENCY_STAFF";
    workspaceId?: string | null;
    workspaceType?: string | null;
    workspaceRole?: string | null;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string | null;
      agencyId?: string | null;
      role: "SUPER_ADMIN" | "ADMIN" | "AGENCY_ADMIN" | "AGENCY_STAFF";
      workspaceId?: string | null;
      workspaceType?: string | null;
      workspaceRole?: string | null;
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
    agencyId?: string | null;
    role: "SUPER_ADMIN" | "ADMIN" | "AGENCY_ADMIN" | "AGENCY_STAFF";
    workspaceId?: string | null;
    workspaceType?: string | null;
    workspaceRole?: string | null;
  }
}
