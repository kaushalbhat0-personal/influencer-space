"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { faqService } from "./service";
import { faqFormSchema } from "./validators";
import type { FAQFormInput } from "./types";
import { afterContentChange } from "@/lib/publishing/content-change";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";

export async function listFAQ() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return faqService.list(tenantId);
}

export async function createFAQItem(input: FAQFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = faqFormSchema.parse(input);
  const limit = await enforceContentLimit({ tenantId, featureKey: FEATURE_IDS.FAQ });
  if (!limit.ok) throw new Error(limit.reason);
  const result = await faqService.create(tenantId, parsed as FAQFormInput);
  revalidatePath("/admin/faq");
  await afterContentChange(tenantId);
  return result;
}

export async function deleteFAQItem(id: string) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  await faqService.delete(tenantId, id);
  revalidatePath("/admin/faq");
  await afterContentChange(tenantId);
}

export async function updateFAQItem(id: string, input: FAQFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = faqFormSchema.parse(input);
  const result = await faqService.update(tenantId, id, parsed as FAQFormInput);
  revalidatePath("/admin/faq");
  await afterContentChange(tenantId);
  return result;
}
