"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { linkService } from "./service";
import type { LinkFormInput } from "./types";

export async function listLinks() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return linkService.list(tenantId);
}

export async function createLink(input: LinkFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const result = await linkService.create(tenantId, input);
  revalidatePath("/admin/links");
  return result;
}

export async function updateLink(id: string, input: Partial<LinkFormInput>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");

  const result = await linkService.update(id, input);
  revalidatePath("/admin/links");
  return result;
}

export async function deleteLink(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");

  await linkService.delete(id);
  revalidatePath("/admin/links");
}
