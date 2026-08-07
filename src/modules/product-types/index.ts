// ── Product Types — Canonical Registry ──────────────────────
// RCCF-IMPLEMENTATION-74 Phase 7. Every commerce product declares its type and
// its fulfillment requirements. Declarative — no branching in consumers.

export type ProductTypeId = "digital" | "physical" | "course" | "service" | "booking" | "affiliate" | "donation";

export interface ProductTypeDefinition {
  id: ProductTypeId;
  label: string;
  requiresPayment: boolean;
  requiresShipping: boolean;
  requiresDownload: boolean;
  requiresBooking: boolean;
  description: string;
}

export const PRODUCT_TYPE_REGISTRY: ProductTypeDefinition[] = [
  { id: "digital", label: "Digital Product", requiresPayment: true, requiresShipping: false, requiresDownload: true, requiresBooking: false, description: "Deliverable by download link after payment." },
  { id: "physical", label: "Physical Product", requiresPayment: true, requiresShipping: true, requiresDownload: false, requiresBooking: false, description: "Shipped to the customer; requires an address." },
  { id: "course", label: "Course", requiresPayment: true, requiresShipping: false, requiresDownload: false, requiresBooking: false, description: "Access-based learning content." },
  { id: "service", label: "Service", requiresPayment: true, requiresShipping: false, requiresDownload: false, requiresBooking: false, description: "A service delivered after purchase." },
  { id: "booking", label: "Booking", requiresPayment: true, requiresShipping: false, requiresDownload: false, requiresBooking: true, description: "Paid appointment / time-slot booking." },
  { id: "affiliate", label: "Affiliate Link", requiresPayment: false, requiresShipping: false, requiresDownload: false, requiresBooking: false, description: "Outbound affiliate link (no payment handled by CreatorStore)." },
  { id: "donation", label: "Donation", requiresPayment: true, requiresShipping: false, requiresDownload: false, requiresBooking: false, description: "A donation to the creator." },
];

export const PRODUCT_TYPE_BY_ID: Record<string, ProductTypeDefinition> = Object.fromEntries(
  PRODUCT_TYPE_REGISTRY.map((t) => [t.id, t]),
);

export const DEFAULT_PRODUCT_TYPE: ProductTypeId = "digital";
