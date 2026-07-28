"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { navigationService } from "@/lib/navigation/service";
import type { NavigationItem } from "@/types/snapshot";

async function requireTenant(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return session.user.tenantId;
}

export async function getNavigation(): Promise<{ success: boolean; data?: NavigationItem[]; error?: string }> {
  try {
    const tenantId = await requireTenant();
    const items = await navigationService.getOrGenerate(tenantId);
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load navigation" };
  }
}

export async function saveNavigation(
  items: NavigationItem[],
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await requireTenant();
    await navigationService.save(tenantId, items);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save navigation" };
  }
}

export async function resetNavigation(): Promise<{ success: boolean; data?: NavigationItem[]; error?: string }> {
  try {
    const tenantId = await requireTenant();
    const items = await navigationService.resetToDefaults(tenantId);
    return { success: true, data: items };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reset navigation" };
  }
}
