"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { domainService } from "./service";

export async function getDomain() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return domainService.get(tenantId);
}

export async function setCustomDomain(domain: string) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const result = await domainService.update(tenantId, domain);
  revalidatePath("/admin/settings/domain");
  return result;
}

export async function removeCustomDomain() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const result = await domainService.remove(tenantId);
  revalidatePath("/admin/settings/domain");
  return result;
}
