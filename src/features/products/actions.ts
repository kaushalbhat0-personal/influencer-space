"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { productService } from "./service";
import { productFormSchema } from "./validators";
import type { ProductFormInput } from "./types";
import { afterContentChange } from "@/lib/publishing/content-change";

export async function listProducts() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return productService.list(tenantId);
}

export async function getProduct(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  return productService.getById(id);
}

export async function createProduct(input: ProductFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = productFormSchema.parse(input);
  const result = await productService.create(tenantId, parsed as ProductFormInput);
  revalidatePath("/admin/products");
  await afterContentChange(tenantId, { revalidateDashboard: true });
  return result;
}

export async function updateProduct(id: string, input: Partial<ProductFormInput>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");

  const result = await productService.update(id, input);
  revalidatePath("/admin/products");
  await afterContentChange(session.user.tenantId, { revalidateDashboard: true });
  return result;
}

export async function deleteProduct(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");

  await productService.delete(id);
  revalidatePath("/admin/products");
  await afterContentChange(session.user.tenantId, { revalidateDashboard: true });
}
