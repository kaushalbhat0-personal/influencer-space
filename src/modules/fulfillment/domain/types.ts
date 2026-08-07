// ── Fulfillment — Domain Types ─────────────────────────────
// RCCF-TRACK-01. The post-payment fulfillment record + strategies.

export type FulfillmentType =
  | "digital" | "physical" | "course" | "service" | "booking" | "affiliate" | "donation";

/** Physical: pending → preparing → packed → shipped → delivered (→ cancelled/returned).
 *  Digital/course: pending → ready (download) → completed.
 *  Service: pending → accepted → completed.
 *  Booking: pending → confirmed → completed. */
export type FulfillmentStatus =
  | "pending" | "preparing" | "packed" | "shipped" | "delivered"
  | "ready" | "completed" | "cancelled" | "returned" | "accepted" | "confirmed";

export interface FulfillmentStrategy {
  type: FulfillmentType;
  requiresShipping: boolean;
  requiresDownload: boolean;
  requiresBooking: boolean;
  requiresManualApproval: boolean;
  requiresInventory: boolean;
  requiresCustomerAction: boolean;
  initialStatus: FulfillmentStatus;
  /** Allowed status transitions for this type. */
  transitions: Record<FulfillmentStatus, FulfillmentStatus[]>;
}

export interface FulfillmentView {
  id: string;
  orderId: string;
  tenantId: string;
  productId: string;
  type: FulfillmentType;
  status: FulfillmentStatus;
  trackingNumber: string | null;
  courier: string | null;
  carrierNotes: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  downloadReady: boolean;
  downloadExpiresAt: string | null;
  downloadCount: number;
  downloadLimit: number;
  timeline: Array<{ status: string; at: string; by?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingAddressInput {
  name?: string;
  phone?: string;
  email?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pin?: string;
  country?: string;
  instructions?: string;
}

export interface FulfillmentUpdateInput {
  status?: FulfillmentStatus;
  trackingNumber?: string;
  courier?: string;
  carrierNotes?: string;
}
