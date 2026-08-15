"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { serviceService } from "./service";
import { serviceFormSchema } from "./validators";
import type { ServiceFormInput } from "./types";
import { afterContentChange } from "@/lib/publishing/content-change";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";
import { prisma } from "@/lib/prisma";
import { bookingService } from "@/features/bookings/service";
import { z } from "zod";

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
  const limit = await enforceContentLimit({ tenantId, featureKey: FEATURE_IDS.SERVICES });
  if (!limit.ok) throw new Error(limit.reason);
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

const bookingSlotSchema = z.object({
  serviceId: z.string().uuid(),
  slotDate: z.string().min(1, "Date is required"),
  slotStart: z.string().min(1, "Start time is required"),
  slotEnd: z.string().min(1, "End time is required"),
  approvalRequired: z.boolean().optional(),
});

/**
 * RCCF-67.5 — create a bookable slot for a Service. The creator must be the
 * authenticated tenant owner of the Service, and the Service must be explicitly
 * bookable. Price and duration are DERIVED server-side from the Service/Offering
 * row — never from the client. Plan enforcement (max_bookings) is applied.
 */
export async function createServiceBookingSlot(input: {
  serviceId: string;
  slotDate: string;
  slotStart: string;
  slotEnd: string;
  approvalRequired?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");

  const parsed = bookingSlotSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid slot data" };

  // Service must belong to the authenticated tenant and be bookable.
  const service = await prisma.offering.findFirst({
    where: { id: parsed.data.serviceId, tenantId, type: "coaching" },
    select: { id: true, title: true, description: true, price: true, bookable: true, metadata: true },
  });
  if (!service) return { success: false, error: "Service not found" };
  if (!service.bookable) return { success: false, error: "Service is not bookable" };

  const meta = (service.metadata as Record<string, unknown> | null) ?? {};
  const durationRaw = (meta.duration as string | null) ?? "60 min";
  const durationMin = Math.max(5, parseInt(durationRaw, 10) || 60);

  // bookingService.create enforces max_bookings server-side (plan authority).
  await bookingService.create({
    tenantId,
    title: service.title,
    description: service.description ?? undefined,
    price: service.price,
    duration: durationMin,
    slotDate: new Date(parsed.data.slotDate),
    slotStart: parsed.data.slotStart,
    slotEnd: parsed.data.slotEnd,
    approvalRequired: parsed.data.approvalRequired ?? true,
    offeringId: service.id,
  });

  revalidatePath("/admin/services");
  revalidatePath("/admin/bookings");
  await afterContentChange(tenantId);
  return { success: true };
}
