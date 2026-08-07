// ── Fulfillment — Strategies ────────────────────────────────
// RCCF-TRACK-01 Phase 2. Configuration-driven fulfillment per product type.

import { PRODUCT_TYPE_BY_ID } from "@/modules/product-types";
import type { FulfillmentStrategy, FulfillmentStatus, FulfillmentType } from "../domain/types";

const STATUS = {
  pending: ["preparing", "packed", "shipped", "ready", "accepted", "confirmed", "completed", "cancelled"],
  preparing: ["packed", "shipped", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned", "cancelled"],
  delivered: ["returned", "completed"],
  ready: ["completed", "cancelled"],
  accepted: ["completed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  returned: [],
} as Record<FulfillmentStatus, FulfillmentStatus[]>;

/** Canonical fulfillment strategy derived from the product-type registry. */
export function getFulfillmentStrategy(type: string): FulfillmentStrategy {
  const t = (PRODUCT_TYPE_BY_ID[type] ? type : "digital") as FulfillmentType;
  const def = PRODUCT_TYPE_BY_ID[t];

  let initialStatus: FulfillmentStatus = "pending";
  if (def.requiresDownload) initialStatus = "pending"; // becomes "ready" on generateDownload
  if (def.requiresManualApproval && t === "service") initialStatus = "pending";
  if (def.requiresBooking) initialStatus = "pending";

  return {
    type: t,
    requiresShipping: def.requiresShipping,
    requiresDownload: def.requiresDownload,
    requiresBooking: def.requiresBooking,
    requiresManualApproval: def.requiresManualApproval,
    requiresInventory: def.requiresInventory,
    requiresCustomerAction: def.requiresCustomerAction,
    initialStatus,
    transitions: STATUS,
  };
}

export function canTransition(strategy: FulfillmentStrategy, from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return (strategy.transitions[from] ?? []).includes(to);
}

/** Human label for a fulfillment status. */
export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pending", preparing: "Preparing", packed: "Packed", shipped: "Shipped",
    delivered: "Delivered", ready: "Ready to download", completed: "Completed",
    cancelled: "Cancelled", returned: "Returned", accepted: "Accepted", confirmed: "Confirmed",
  };
  return map[status] ?? status;
}
