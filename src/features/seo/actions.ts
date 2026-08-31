"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { seoService } from "./service";
import type { SEOFormInput } from "./types";
import { afterContentChange } from "@/lib/publishing/content-change";
import { assertAgencyOwnsTenant } from "@/modules/partner/application/authorization";

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
  await afterContentChange(tenantId);
  return result;
}

export async function agencyGetSEO(tenantId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) throw new Error("Unauthorized");
  const owned = await assertAgencyOwnsTenant(session.user.id, session.user.agencyId, tenantId);
  if (!owned.ok) throw new Error(owned.error ?? "Forbidden");
  return seoService.get(tenantId);
}

export async function agencyUpdateSEO(tenantId: string, input: SEOFormInput) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.agencyId) throw new Error("Unauthorized");
  const owned = await assertAgencyOwnsTenant(session.user.id, session.user.agencyId, tenantId);
  if (!owned.ok) throw new Error(owned.error ?? "Forbidden");
  // Only human fields — strip any technical internals if passed
  const human: SEOFormInput = { title: input.title, description: input.description, ogImage: input.ogImage };
  const result = await seoService.update(tenantId, human);
  await afterContentChange(tenantId);
  return result;
}
