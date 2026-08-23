// RCCF-70.4.2 (Workstreams 3–5) — Product Presentation Helpers.
// Pure, deterministic, presentation-only. No database, no server actions, no
// capability lookups. Reuses the canonical registries/enums — never a second
// product-type registry, never a new commerce mode, never a renamed status.

import { PRODUCT_TYPE_BY_ID } from "@/modules/product-types";
import type { ProductTypeId } from "@/modules/product-types";
import { normalizeCommerceMode } from "@/config/commerce/commerce-mode";
import type { CommerceMode } from "@/config/commerce/commerce-mode";
import type { BadgeVariant } from "@/components/ui/Badge";

// ── Workstream 3 — Product type display label ────────────────────────
// Maps an internal ProductTypeId to its human-readable label from the
// canonical registry. Unknown/invalid types fall back deterministically to the
// raw id (no invented labels, no registry duplication).
export function getProductTypeLabel(type: ProductTypeId): string {
  return PRODUCT_TYPE_BY_ID[type]?.label ?? type;
}

// ── Workstream 4 — Commerce mode presentation ─────────────────────────
// Distinct, neutral presentation for the three immutable modes. The variants
// deliberately carry no success/warning semantics so the badge never implies
// behavior. Commerce behavior itself stays exactly where it is today.
export interface CommerceModePresentation {
  label: string;
  badgeVariant: BadgeVariant;
}

const COMMERCE_MODE_PRESENTATION: Record<CommerceMode, CommerceModePresentation> = {
  ONLINE: { label: "Online", badgeVariant: "info" },
  WHATSAPP: { label: "WhatsApp", badgeVariant: "cyan" },
  BOTH: { label: "Online + WhatsApp", badgeVariant: "gold" },
};

export function getCommerceModePresentation(mode: CommerceMode): CommerceModePresentation {
  return COMMERCE_MODE_PRESENTATION[normalizeCommerceMode(mode)];
}

// ── Workstream 5 — Product status presentation ────────────────────────
// Repository vocabulary is authoritative (DRAFT/PUBLISHED/ARCHIVED — never
// Stitch's Active/Draft/Hidden). Semantic direction: PUBLISHED → success,
// DRAFT → warning, ARCHIVED → muted/neutral.
export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ProductStatusPresentation {
  label: string;
  badgeVariant: BadgeVariant;
}

const PRODUCT_STATUS_PRESENTATION: Record<ProductStatus, ProductStatusPresentation> = {
  PUBLISHED: { label: "Published", badgeVariant: "success" },
  DRAFT: { label: "Draft", badgeVariant: "warning" },
  ARCHIVED: { label: "Archived", badgeVariant: "default" },
};

export function getProductStatusPresentation(status: ProductStatus): ProductStatusPresentation {
  return PRODUCT_STATUS_PRESENTATION[status] ?? { label: status, badgeVariant: "default" };
}