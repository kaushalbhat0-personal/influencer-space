"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AffiliateService } from "@/services/affiliate.service";
import { StorageService } from "@/services/storage.service";
import { AFFILIATES_ROUTE } from "@/lib/constants";
import { getTenantContext } from "@/lib/tenant";

const affiliateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  url: z.string().url("Must be a valid URL"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional(),
});

export type AffiliateActionState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

async function requireTenant(): Promise<string> {
  const tenant = await getTenantContext();
  if (!tenant) throw new Error("Unauthorized — no tenant context");
  return tenant.id;
}

export async function createAffiliate(
  _prevState: AffiliateActionState,
  formData: FormData,
): Promise<AffiliateActionState> {
  const raw = Object.fromEntries(formData);
  console.log("🔗 createAffiliate called with:", raw);

  const parsed = affiliateSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
    imageUrl: formData.get("imageUrl"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    console.log("🔗 createAffiliate validation failed:", parsed.error.flatten().fieldErrors);
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireTenant();
    const result = await AffiliateService.create(tenantId, {
      title: parsed.data.title,
      url: parsed.data.url,
      imageUrl: parsed.data.imageUrl || undefined,
      isActive: parsed.data.isActive,
    });
    console.log("🔗 createAffiliate success:", result.id);
    revalidatePath(AFFILIATES_ROUTE);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("🔗 createAffiliate error:", error);
    return { success: false, error: "Failed to create affiliate" };
  }
}

export async function updateAffiliate(
  _prevState: AffiliateActionState,
  formData: FormData,
): Promise<AffiliateActionState> {
  const id = formData.get("id") as string;
  const raw = Object.fromEntries(formData);
  console.log("🔗 updateAffiliate called — id:", id, "data:", raw);

  if (!id) {
    console.log("🔗 updateAffiliate missing id");
    return { success: false, error: "Affiliate ID is required" };
  }

  const parsed = affiliateSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
    imageUrl: formData.get("imageUrl"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    console.log("🔗 updateAffiliate validation failed:", parsed.error.flatten().fieldErrors);
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const tenantId = await requireTenant();
    await AffiliateService.update(id, tenantId, {
      title: parsed.data.title,
      url: parsed.data.url,
      imageUrl: parsed.data.imageUrl || undefined,
      isActive: parsed.data.isActive,
    });
    console.log("🔗 updateAffiliate success — id:", id);
    revalidatePath(AFFILIATES_ROUTE);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("🔗 updateAffiliate error:", error);
    return { success: false, error: "Failed to update affiliate" };
  }
}

export async function deleteAffiliate(
  id: string,
): Promise<AffiliateActionState> {
  console.log("🔗 deleteAffiliate called — id:", id);
  try {
    const tenantId = await requireTenant();
    const affiliate = await AffiliateService.findById(id, tenantId);
    console.log("🔗 deleteAffiliate found:", affiliate?.id);
    if (affiliate?.imageUrl) {
      const path = StorageService.extractPathFromUrl(affiliate.imageUrl);
      console.log("🔗 deleteAffiliate extracting storage path:", path);
      if (path) {
        await StorageService.delete(path);
        console.log("🔗 deleteAffiliate storage file deleted:", path);
      }
    }
    await AffiliateService.delete(id, tenantId);
    console.log("🔗 deleteAffiliate success — id:", id);
    revalidatePath(AFFILIATES_ROUTE);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("🔗 deleteAffiliate error:", error);
    return { success: false, error: "Failed to delete affiliate" };
  }
}

export async function incrementAffiliateClicks(
  id: string,
): Promise<AffiliateActionState> {
  console.log("🔗 incrementAffiliateClicks called — id:", id);
  try {
    const tenantId = await requireTenant();
    await AffiliateService.incrementClicks(id, tenantId);
    console.log("🔗 incrementAffiliateClicks success — id:", id);
    return { success: true };
  } catch (error) {
    console.error("🔗 incrementAffiliateClicks error:", error);
    return { success: false, error: "Failed to increment clicks" };
  }
}

export async function toggleAffiliateActive(
  id: string,
): Promise<AffiliateActionState> {
  console.log("🔗 toggleAffiliateActive called — id:", id);
  try {
    const tenantId = await requireTenant();
    await AffiliateService.toggleActive(id, tenantId);
    console.log("🔗 toggleAffiliateActive success — id:", id);
    revalidatePath(AFFILIATES_ROUTE);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("🔗 toggleAffiliateActive error:", error);
    return { success: false, error: "Failed to toggle affiliate status" };
  }
}
