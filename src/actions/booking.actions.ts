"use server";

import { requireTenant } from "@/lib/auth/require-tenant";
import { prisma } from "@/lib/prisma";
import { bookingService } from "@/features/bookings/service";
import { revalidatePath } from "next/cache";

export async function createBooking(params: {
  title: string;
  description?: string;
  price?: number;
  duration?: number;
  slotDate: string;
  slotStart?: string;
  slotEnd?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  approvalRequired?: boolean;
}) {
  const { tenantId } = await requireTenant();
  const booking = await bookingService.create({
    tenantId,
    title: params.title,
    description: params.description,
    price: params.price,
    duration: params.duration,
    slotDate: new Date(params.slotDate),
    slotStart: params.slotStart,
    slotEnd: params.slotEnd,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    notes: params.notes,
    approvalRequired: params.approvalRequired,
  });
  revalidatePath("/admin/bookings");
  return { success: true, booking };
}

export async function approveBooking(bookingId: string) {
  const { tenantId } = await requireTenant();
  // VALIDATION-01 V-037: never approve another tenant's booking.
  const owned = await prisma.booking.findFirst({ where: { id: bookingId, tenantId }, select: { id: true } });
  if (!owned) throw new Error("Booking not found");
  await bookingService.approve(bookingId);
  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function cancelBooking(bookingId: string) {
  const { tenantId } = await requireTenant();
  // VALIDATION-01 V-037: never cancel another tenant's booking.
  const owned = await prisma.booking.findFirst({ where: { id: bookingId, tenantId }, select: { id: true } });
  if (!owned) throw new Error("Booking not found");
  await bookingService.cancel(bookingId);
  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function getBookingSlots(date: string) {
  const { tenantId } = await requireTenant();
  return bookingService.getSlots(tenantId, new Date(date));
}

export async function getBookingStats(_clientTenantId: string) {
  // VALIDATION-01 V-037: authenticate and always use the session tenant.
  const { tenantId } = await requireTenant();
  return bookingService.getStats(tenantId);
}
