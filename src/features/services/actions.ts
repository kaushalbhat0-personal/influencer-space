"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { serviceService } from "./service";
import { serviceFormSchema } from "./validators";
import type { ServiceFormInput } from "./types";
import { afterContentChange } from "@/lib/publishing/content-change";

export async function listServices() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return serviceService.list(tenantId);
}

export async function createService(input: ServiceFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = serviceFormSchema.parse(input);
  const result = await serviceService.create(tenantId, parsed as ServiceFormInput);
  revalidatePath("/admin/services");
  await afterContentChange(tenantId);
  return result;
}

export async function updateService(id: string, input: ServiceFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = serviceFormSchema.parse(input);
  const result = await serviceService.update(tenantId, id, parsed as ServiceFormInput);
  revalidatePath("/admin/services");
  await afterContentChange(tenantId);
  return result;
}

export async function deleteService(id: string) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  await serviceService.delete(tenantId, id);
  revalidatePath("/admin/services");
  await afterContentChange(tenantId);
}
