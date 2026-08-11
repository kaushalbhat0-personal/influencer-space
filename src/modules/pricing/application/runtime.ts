// ── Runtime Pricing Module — RCCF-IMPLEMENTATION-71 ─────────────────────────
// BillingPlan (DB) becomes the canonical RUNTIME pricing source. The static
// registry (`src/config/commerce/plans.ts`) provides DEFAULTS/fallback. Every
// surface — marketing, pricing, comparison, checkout, upgrade dialogs, the
// public API and the Pricing Center — reads through this module. Request-scoped
// caching (React.cache) keeps reads at one query per request.

import { cache as reactCache } from "react";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/capabilities";
import {
  COMMERCE_PLANS,
  getCommercePlan,
  LEGACY_TO_CANONICAL,
  type CommercePlanConfig,
} from "@/config/commerce/plans";

const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

// ── Types ────────────────────────────────────────────────────────────────────

export interface ScheduledPrice {
  price: number | null;
  annualPrice: number | null;
  effectiveAt: string;
}

export interface PlanRuntimeConfig {
  family?: "creator" | "partner";
  capabilities?: string[];
  featureOverrides?: Record<string, number | boolean | string>;
  marketing?: {
    description?: string;
    targetAudience?: string;
    highlights?: string[];
    badge?: string;
    ctaLabel?: string;
    ctaType?: "signup" | "checkout" | "contact";
    comparisonOrder?: number;
    trialDays?: number;
    hidden?: boolean;
    enterprise?: boolean;
    popular?: boolean;
    bestValue?: boolean;
    recommended?: boolean;
    colorAccent?: string;
    comparisonTitle?: string;
    subtitle?: string;
    valueStatement?: string;
  };
  pricing?: {
    price?: number | null;
    annualPrice?: number | null;
    schedule?: ScheduledPrice[];
  };
  updatedBy?: string;
  updatedAt?: string;
  changeNote?: string;
}

export interface ResolvedPlan {
  code: string;
  name: string;
  family: "creator" | "partner";
  description: string;
  marketingDescription: string;
  targetAudience: string | null;
  price: number | null;
  annualPrice: number | null;
  currency: string;
  badge: string | null;
  ctaLabel: string;
  ctaType: "signup" | "checkout" | "contact";
  trialDays: number | null;
  gracePeriodDays: number;
  hidden: boolean;
  enterprise: boolean;
  popular: boolean;
  bestValue: boolean;
  recommended: boolean;
  comparisonOrder: number;
  colorAccent: string | null;
  capabilities: string[];
  featureOverrides: Record<string, number | boolean | string>;
  features: Record<string, number | boolean | string>;
  highlights: string[];
  scheduled: ScheduledPrice[];
}

// ── Merge: registry defaults ← runtime config ────────────────────────────────

/** Merge a plan's runtime config over its registry defaults. Exported for tests. */
export function mergeRuntimePlan(defaults: CommercePlanConfig, rc?: PlanRuntimeConfig): ResolvedPlan {
  const m = rc?.marketing;
  const p = rc?.pricing;
  return {
    code: defaults.code,
    name: defaults.name, // name is a scalar column, not runtimeConfig — see resolveRuntimePlans
    family: defaults.family,
    description: m?.description ?? defaults.marketingDescription ?? defaults.description,
    marketingDescription: m?.description ?? defaults.marketingDescription ?? defaults.description,
    targetAudience: m?.targetAudience ?? (defaults as { targetAudience?: string }).targetAudience ?? null,
    price: p?.price !== undefined ? p.price : defaults.price,
    annualPrice: p?.annualPrice !== undefined ? p.annualPrice : defaults.annualPrice ?? null,
    currency: defaults.currency,
    badge: m?.badge ?? defaults.badge ?? null,
    ctaLabel: m?.ctaLabel ?? defaults.ctaLabel,
    ctaType: m?.ctaType ?? defaults.ctaType,
    trialDays: m?.trialDays ?? defaults.trialDays ?? null,
    gracePeriodDays: 0, // filled from the DB column in resolveRuntimePlans
    hidden: m?.hidden ?? defaults.hidden ?? false,
    enterprise: m?.enterprise ?? defaults.enterprise ?? false,
    popular: m?.popular ?? defaults.popular ?? false,
    bestValue: m?.bestValue ?? defaults.bestValue ?? false,
    recommended: m?.recommended ?? defaults.recommended ?? false,
    comparisonOrder: m?.comparisonOrder ?? defaults.comparisonOrder ?? defaults.sortOrder ?? 99,
    colorAccent: m?.colorAccent ?? null,
    capabilities: rc?.capabilities ?? defaults.capabilities,
    featureOverrides: rc?.featureOverrides ?? defaults.featureOverrides ?? {},
    features: {}, // filled from the capability engine in resolveRuntimePlans
    highlights: m?.highlights ?? defaults.marketingHighlights ?? [],
    scheduled: p?.schedule ?? [],
  };
}

// ── Runtime resolution (request-cached) ──────────────────────────────────────

const loadCached = requestCache(async (): Promise<Map<string, ResolvedPlan>> => {
  // Fallback: resolve purely from the registry (no DB) — used at build time and
  // if the database is briefly unavailable. BillingPlan is the runtime source
  // when present.
  const fallback = () => {
    const out = new Map<string, ResolvedPlan>();
    for (const defaults of COMMERCE_PLANS) {
      const plan = mergeRuntimePlan(defaults);
      plan.features = getPlan(defaults.code)?.features ?? {};
      out.set(defaults.code, plan);
    }
    return out;
  };

  let rows: Array<{ code: string; name: string; family: string; price: number; currency: string; status: string; gracePeriodDays: number | null; runtimeConfig: unknown }>;
  try {
    rows = await prisma.billingPlan.findMany({
      select: {
        code: true,
        name: true,
        family: true,
        price: true,
        currency: true,
        status: true,
        gracePeriodDays: true,
        runtimeConfig: true,
      },
    });
  } catch {
    return fallback();
  }
  const byCode = new Map(rows.map((r) => [r.code, r]));

  const out = new Map<string, ResolvedPlan>();
  for (const defaults of COMMERCE_PLANS) {
    const row = byCode.get(defaults.code);
    if (!row) {
      out.set(defaults.code, mergeRuntimePlan(defaults));
      continue;
    }
    const rc = row.runtimeConfig as PlanRuntimeConfig | null;
    const plan = mergeRuntimePlan(defaults, rc ?? undefined);
    // Scalar columns (DB runtime) override.
    plan.name = row.name;
    if (row.price !== undefined && rc?.pricing?.price === undefined) plan.price = row.price;
    plan.currency = row.currency;
    plan.gracePeriodDays = row.gracePeriodDays ?? 0;
    // Effective feature map = capability-engine defaults + runtime overrides.
    const registryFeatures = getPlan(defaults.code)?.features ?? {};
    plan.features = { ...registryFeatures, ...(rc?.featureOverrides ?? {}) };
    out.set(defaults.code, plan);
  }

  // Brand-new plans created at runtime (not in the static registry). Only
  // surfaced when a Super Admin explicitly configured the row through the
  // Pricing Center (runtimeConfig set). Historical/legacy codes (in
  // LEGACY_TO_CANONICAL) and non-ACTIVE rows never leak into runtime surfaces.
  for (const row of rows) {
    if (out.has(row.code)) continue;
    if (row.status !== "ACTIVE") continue;
    if (Object.prototype.hasOwnProperty.call(LEGACY_TO_CANONICAL, row.code)) continue;
    const rc = row.runtimeConfig as PlanRuntimeConfig | null;
    if (!rc) continue;
    const family = rc.family ?? (row.family === "agency" ? "partner" : "creator");
    out.set(row.code, {
      code: row.code,
      name: row.name,
      family,
      description: rc?.marketing?.description ?? "",
      marketingDescription: rc?.marketing?.description ?? "",
      targetAudience: rc?.marketing?.targetAudience ?? null,
      price: rc?.pricing?.price !== undefined ? rc.pricing.price : row.price,
      annualPrice: rc?.pricing?.annualPrice ?? null,
      currency: row.currency,
      badge: rc?.marketing?.badge ?? null,
      ctaLabel: rc?.marketing?.ctaLabel ?? "Get Started",
      ctaType: rc?.marketing?.ctaType ?? "signup",
      trialDays: rc?.marketing?.trialDays ?? null,
      gracePeriodDays: row.gracePeriodDays ?? 0,
      hidden: rc?.marketing?.hidden ?? false,
      enterprise: rc?.marketing?.enterprise ?? false,
      popular: rc?.marketing?.popular ?? false,
      bestValue: rc?.marketing?.bestValue ?? false,
      recommended: rc?.marketing?.recommended ?? false,
      comparisonOrder: rc?.marketing?.comparisonOrder ?? 99,
      colorAccent: rc?.marketing?.colorAccent ?? null,
      capabilities: rc?.capabilities ?? [],
      featureOverrides: rc?.featureOverrides ?? {},
      features: { ...(rc?.featureOverrides ?? {}) },
      highlights: rc?.marketing?.highlights ?? [],
      scheduled: rc?.pricing?.schedule ?? [],
    });
  }
  return out;
});

export async function getRuntimePlans(): Promise<ResolvedPlan[]> {
  return Array.from((await loadCached()).values());
}

export async function getRuntimePlan(code: string): Promise<ResolvedPlan | undefined> {
  const canonical = resolveCanonicalCode(code);
  return (await loadCached()).get(canonical);
}

export async function getRuntimePlansByFamily(family: "creator" | "partner"): Promise<ResolvedPlan[]> {
  return (await getRuntimePlans()).filter((p) => p.family === family);
}

/** Public comparison plans (no hidden, no enterprise), ordered for display. */
export async function getComparisonPlans(family: "creator" | "partner"): Promise<ResolvedPlan[]> {
  return (await getRuntimePlansByFamily(family))
    .filter((p) => !p.hidden && !p.enterprise)
    .sort((a, b) => a.comparisonOrder - b.comparisonOrder);
}

export async function getEnterprisePlan(family: "creator" | "partner"): Promise<ResolvedPlan | undefined> {
  return (await getRuntimePlansByFamily(family)).find((p) => p.enterprise);
}

/** Everything the marketing pricing page needs, in one request-scoped load. */
export async function getPublicPricingData(): Promise<{
  creator: ResolvedPlan[];
  partner: ResolvedPlan[];
  enterpriseCreator: ResolvedPlan | null;
  enterprisePartner: ResolvedPlan | null;
}> {
  const [creator, partner, enterpriseCreator, enterprisePartner] = await Promise.all([
    getComparisonPlans("creator"),
    getComparisonPlans("partner"),
    getEnterprisePlan("creator"),
    getEnterprisePlan("partner"),
  ]);
  return { creator, partner, enterpriseCreator: enterpriseCreator ?? null, enterprisePartner: enterprisePartner ?? null };
}

function resolveCanonicalCode(code: string): string {
  return LEGACY_TO_CANONICAL[code] ?? code;
}

/** Effective monthly price honoring the pricing schedule (Phase 9). */
export async function getEffectiveMonthlyPrice(code: string, cycle: "monthly" | "yearly" = "monthly"): Promise<number | null> {
  const plan = await getRuntimePlan(code);
  if (!plan) return null;
  const now = Date.now();
  const applicable = plan.scheduled
    .filter((s) => new Date(s.effectiveAt).getTime() <= now)
    .sort((a, b) => new Date(b.effectiveAt).getTime() - new Date(a.effectiveAt).getTime())[0];
  if (applicable) {
    const base = cycle === "yearly" ? applicable.annualPrice : applicable.price;
    return base;
  }
  return cycle === "yearly" ? plan.annualPrice : plan.price;
}

export async function getAnnualSavingsPercent(code: string): Promise<number | null> {
  const plan = await getRuntimePlan(code);
  if (!plan || plan.price === null || !plan.annualPrice) return null;
  const annualized = plan.price * 12;
  if (annualized <= 0) return null;
  return Math.round((1 - plan.annualPrice / annualized) * 100);
}

/** Upgrade copy: what the next visible tier adds (Phase 6). */
export async function getUpgrade(code: string): Promise<{ target: ResolvedPlan | null; added: string[] }> {
  const plan = await getRuntimePlan(code);
  if (!plan) return { target: null, added: [] };
  const tier = await getComparisonPlans(plan.family);
  const idx = tier.findIndex((p) => p.code === plan.code);
  const next = tier[idx + 1];
  if (!next) return { target: null, added: [] };
  const prev = idx > 0 ? tier[idx - 1] : null;
  const prevHighlights = new Set(prev?.highlights ?? []);
  const added = next.highlights.filter(
    (h) => h !== "Everything in Growth" && h !== "Everything in Solo" && !prevHighlights.has(h),
  );
  return { target: next, added: added.length > 0 ? added : next.highlights };
}

// ── Phase 13 — Public module API ─────────────────────────────────────────────

export function getPlans() {
  return getRuntimePlans();
}
export function getComparison(family: "creator" | "partner") {
  return getComparisonPlans(family);
}
export function getUpgradePath(code: string) {
  return getUpgrade(code);
}
export function getCapabilities(code: string) {
  return getRuntimePlan(code).then((p) => p?.capabilities ?? []);
}
export function getLimits(code: string) {
  return getRuntimePlan(code).then((p) => p?.featureOverrides ?? {});
}

// ── Helpers for capability/entitlement sync (Phase 3) ────────────────────────

/** Effective feature map for a plan (overrides merged over the registry). */
export async function getEffectiveFeatures(code: string): Promise<Record<string, number | boolean | string>> {
  const defaults = getCommercePlan(code);
  const base = defaults ? { ...defaults.featureOverrides } : {};
  const plan = await getRuntimePlan(code);
  return { ...base, ...(plan?.featureOverrides ?? {}) };
}

/** All capability codes across the catalog (for the editor's grouped list). */
export const ALL_CAPABILITY_CODES = COMMERCE_PLANS[0]
  ? Array.from(new Set(COMMERCE_PLANS.flatMap((p) => p.capabilities)))
  : [];
