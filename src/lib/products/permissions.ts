import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { workspaceService } from "@/modules/workspace/application/service";

export async function requireAuth(tenantId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const resolvedTenantId = await workspaceService.resolveTenantId();
  const effectiveTenantId = resolvedTenantId ?? session.user.tenantId;
  if (session.user.role !== "SUPER_ADMIN" && effectiveTenantId !== tenantId) {
    throw new Error("Forbidden");
  }
}

export function requireProductFound<T>(product: T | null): asserts product is T {
  if (!product) throw new Error("Product not found");
}
