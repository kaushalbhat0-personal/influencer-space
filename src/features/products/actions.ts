"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { productService } from "./service";
import { productFormSchema } from "./validators";
import type { ProductData, ProductFormInput } from "./types";
import { afterContentChange } from "@/lib/publishing/content-change";
import { withLaunchCoreContentCapacity } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";

export async function listProducts() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return productService.list(tenantId);
}

export async function getProduct(id: string) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  // VALIDATION-01 V-035: scope to the session tenant.
  return productService.getById(id, tenantId);
}

export async function createProduct(input: ProductFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = productFormSchema.parse(input);
  const outcome = await withLaunchCoreContentCapacity(tenantId, FEATURE_IDS.PRODUCTS, (tx) =>
    productService.create(tenantId, parsed as ProductFormInput, tx),
  );
  if (typeof outcome === "object" && outcome !== null && "ok" in outcome) {
    if (!outcome.ok) throw new Error(outcome.reason ?? "Limit reached for this plan.");
  }
  const result = outcome as ProductData;
  revalidatePath("/admin/products");
  await afterContentChange(tenantId, { revalidateDashboard: true });
  return result;
}

export async function updateProduct(id: string, input: Partial<ProductFormInput>) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  // VALIDATION-01 V-029: validate updates (blocks negative/NaN prices).
  const parsed = productFormSchema.partial().parse(input);
  const result = await productService.update(id, tenantId, parsed as Partial<ProductFormInput>);
  revalidatePath("/admin/products");
  await afterContentChange(tenantId, { revalidateDashboard: true });
  return result;
}

export async function deleteProduct(id: string) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  // VALIDATION-01 V-035: scope to the session tenant.
  await productService.delete(id, tenantId);
  revalidatePath("/admin/products");
  await afterContentChange(tenantId, { revalidateDashboard: true });
}
