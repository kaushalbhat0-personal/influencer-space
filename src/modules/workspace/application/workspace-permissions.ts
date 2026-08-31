import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireAuth(tenantId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  // RCCF-LAUNCH-01: strict creator isolation — always compare against the
  // server-authoritative session tenantId. The previous workspace-cookie
  // derived effectiveTenantId introduced a second trust root; creator content
  // (Gallery, etc.) must remain strictly tenant-bound via JWT.
  const effectiveTenantId = session.user.tenantId;
  if (session.user.role !== "SUPER_ADMIN" && effectiveTenantId !== tenantId) {
    throw new Error("Forbidden");
  }
}

export function requireFound<T>(item: T | null): asserts item is T {
  if (!item) throw new Error("Gallery item not found");
}
