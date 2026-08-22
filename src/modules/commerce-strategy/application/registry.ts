// ── Commerce Strategy — Canonical Registry ──────────────────
// RCCF-IMPLEMENTATION-73 Phase 2. Every strategy is declarative. No branching
// in consumers — they read `definition` fields and `resolveCommerceStrategy`.

import type { CommerceStrategyDefinition } from "../domain/types";

export const COMMERCE_STRATEGY_REGISTRY: CommerceStrategyDefinition[] = [
  {
    id: "PLATFORM_COLLECT",
    label: "Platform Collect",
    description: "CreatorStore is the merchant of record. Funds land in the platform account. Used today; the default.",
    merchantOfRecord: "platform",
    supportsTransfers: false,
    supportsSubscriptions: true,
    supportsProducts: true,
    supportsBookings: true,
    supportsServices: true,
    supportsCourses: true,
    requiresLinkedAccount: false,
    requiresSettlement: false,
    requiresShipping: false,
    requiresDigitalDelivery: false,
    status: "active",
  },
  {
    id: "DIRECT_CREATOR",
    label: "Direct Creator",
    description: "Active. The creator is the merchant of record for product sales. Funds land in the creator's own Razorpay account. CreatorStore never touches product revenue.",
    merchantOfRecord: "creator",
    supportsTransfers: false,
    supportsSubscriptions: true,
    supportsProducts: true,
    supportsBookings: true,
    supportsServices: true,
    supportsCourses: true,
    requiresLinkedAccount: true,
    requiresSettlement: true,
    requiresShipping: false,
    requiresDigitalDelivery: false,
    status: "active",
  },
  {
    id: "MARKETPLACE",
    label: "Marketplace",
    description: "Reserved. Platform collects, splits and settles. Not implemented — architecture only.",
    merchantOfRecord: "platform",
    supportsTransfers: true,
    supportsSubscriptions: true,
    supportsProducts: true,
    supportsBookings: true,
    supportsServices: true,
    supportsCourses: true,
    requiresLinkedAccount: true,
    requiresSettlement: true,
    requiresShipping: false,
    requiresDigitalDelivery: false,
    status: "reserved",
  },
  {
    id: "HYBRID",
    label: "Hybrid",
    description: "Reserved. Per-product strategy selection. Not implemented — architecture only.",
    merchantOfRecord: "platform",
    supportsTransfers: false,
    supportsSubscriptions: true,
    supportsProducts: true,
    supportsBookings: true,
    supportsServices: true,
    supportsCourses: true,
    requiresLinkedAccount: true,
    requiresSettlement: false,
    requiresShipping: false,
    requiresDigitalDelivery: false,
    status: "reserved",
  },
];

export const COMMERCE_STRATEGY_BY_ID: Record<string, CommerceStrategyDefinition> = Object.fromEntries(
  COMMERCE_STRATEGY_REGISTRY.map((s) => [s.id, s]),
);

export const DEFAULT_COMMERCE_STRATEGY_ID = "PLATFORM_COLLECT" as const;
