"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { testimonialService } from "./service";
import { testimonialFormSchema } from "./validators";
import type { TestimonialFormInput } from "./types";

export async function listTestimonials() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return testimonialService.list(tenantId);
}

export async function createTestimonial(input: TestimonialFormInput) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = testimonialFormSchema.parse(input);
  const result = await testimonialService.create(tenantId, parsed as TestimonialFormInput);
  revalidatePath("/admin/testimonials");
  return result;
}

export async function deleteTestimonial(id: string) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  await testimonialService.delete(tenantId, id);
  revalidatePath("/admin/testimonials");
}
