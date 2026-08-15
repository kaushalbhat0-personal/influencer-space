"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/lib/tenant";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";
import { captureError } from "@/lib/observability/error-tracker";
import { logger } from "@/lib/observability/logger";

/**
 * RCCF-67.4 — public storefront booking.
 *
 * Security boundary:
 *   - The tenant is resolved SERVER-side from the middleware-derived
 *     `x-tenant-host` header (getTenantContext) — the visitor never supplies
 *     tenantId / agencyId / workspaceId / creatorId.
 *   - The slot (Booking id) must belong to the resolved tenant and be an OPEN
 *     slot (no customer claimed yet, not cancelled, in the future).
 *   - Price is derived from the stored Booking row — never from the client.
 *   - The claim is an ATOMIC guarded update (`customerEmail IS NULL` in WHERE),
 *     so two concurrent visitors cannot both book the same slot.
 *   - approvalRequired semantics are preserved: no silent approval.
 */

const bookingRequestSchema = z.object({
  bookingId: z.string().uuid(),
  customerName: z.string().min(1, "Name is required").max(200),
  customerEmail: z.string().email("A valid email is required"),
  customerPhone: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
});

export type PublicBookingState = {
  success: boolean;
  error?: string;
  status?: "confirmed" | "pending approval";
  fieldErrors?: Record<string, string[]>;
};

async function clientIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  } catch {
    return "unknown";
  }
}

export async function submitPublicBooking(
  _prevState: PublicBookingState,
  formData: FormData,
): Promise<PublicBookingState> {
  const parsed = bookingRequestSchema.safeParse({
    bookingId: formData.get("bookingId"),
    customerName: formData.get("customerName"),
    customerEmail: formData.get("customerEmail"),
    customerPhone: formData.get("customerPhone") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    // Server-authoritative tenant from the storefront host.
    const tenant = await getTenantContext();
    if (!tenant) return { success: false, error: "Invalid storefront" };

    // Rate limit per IP (reuses the platform in-memory limiter).
    const ip = await clientIp();
    const rate = checkRateLimit(`/public-bookings:${ip}`, "/public-bookings");
    if (!rate.allowed) return { success: false, error: "Too many booking requests. Please try again later." };

    // Plan enforcement: max_bookings=0 (Launch) must not be actionable even if a
    // stale open slot somehow exists. The slot must belong to the resolved tenant.
    const limit = await enforceContentLimit({ tenantId: tenant.id, featureKey: FEATURE_IDS.BOOKINGS, used: 0 });
    if (!limit.ok) return { success: false, error: limit.reason };

    // RCCF-67.5 — if the slot belongs to a Service (offeringId set), the Service
    // must be published, belong to the same tenant, and be explicitly bookable.
    // A non-bookable or foreign service can never be booked through the storefront.
    const slotWithService = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      select: { offeringId: true },
    });
    if (slotWithService?.offeringId) {
      const offering = await prisma.offering.findFirst({
        where: { id: slotWithService.offeringId, tenantId: tenant.id, type: "coaching" },
        select: { bookable: true, status: true },
      });
      if (!offering || !offering.bookable || offering.status !== "published") {
        return { success: false, error: "This service is no longer available for booking." };
      }
    }

    // Atomic claim: only an OPEN slot (customerEmail null), non-cancelled, future.
    const now = new Date();
    const claimed = await prisma.booking.updateMany({
      where: {
        id: parsed.data.bookingId,
        tenantId: tenant.id,
        customerEmail: null,
        status: { not: "cancelled" },
        slotDate: { gte: now },
      },
      data: {
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail.trim().toLowerCase(),
        customerPhone: parsed.data.customerPhone || null,
        notes: parsed.data.notes || null,
      },
    });

    // updateMany returns { count }; no row matched → slot unavailable / already claimed.
    if (claimed.count !== 1) {
      return { success: false, error: "This slot is no longer available. Please choose another time." };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      select: { status: true, approvalRequired: true, price: true },
    });
    const status: PublicBookingState["status"] =
      booking?.approvalRequired === false ? "confirmed" : "pending approval";

    logger.info("submitPublicBooking success", "storefront-bookings", { metadata: { bookingId: parsed.data.bookingId, status } as Record<string, unknown> });
    return { success: true, status };
  } catch (error) {
    captureError(error, { service: "storefront-bookings", operation: "submitPublicBooking" });
    return { success: false, error: "Failed to submit your booking. Please try again." };
  }
}
