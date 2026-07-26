"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { BuilderPage } from "@/lib/builder/types";

export async function getBuilderPages() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  const { loadBuilderPages } = await import("@/actions/builder.actions");
  return loadBuilderPages();
}

export async function saveBuilder(pages: BuilderPage[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  const { saveBuilderPages } = await import("@/actions/builder.actions");
  const res = await saveBuilderPages(pages);
  revalidatePath("/admin/builder");
  return res;
}

export async function publishBuilder(pages: BuilderPage[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  const { publishWebsite } = await import("@/actions/builder.actions");
  const res = await publishWebsite(pages);
  revalidatePath("/admin/builder");
  return res;
}
