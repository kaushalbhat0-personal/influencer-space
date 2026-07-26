"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { seoService } from "./service";
import type { SEOFormInput } from "./types";

export async function getSEO() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return seoService.get(tenantId);
}

export async function updateSEO(input: SEOFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const result = await seoService.update(tenantId, input);
  revalidatePath("/admin/seo");
  return result;
}
