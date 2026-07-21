/**
 * Billing v2 — Plan Catalog
 *
 * Immutable catalog of all plans. Feature values are typed (int/bool/string).
 * UI metadata (recommended, badge, ctaType, etc.) belongs here — not in the UI.
 */

import type { PlanDefinition, FeatureDefinition } from "./types";

// ── FEATURE DEFINITIONS ───────────────────────────────────────────────────────

export const FEATURES: FeatureDefinition[] = [
  { key: "max_products",        description: "Maximum products per store",          valueType: "integer" },
  { key: "custom_domain",       description: "Custom domain support",               valueType: "boolean" },
  { key: "custom_branding",     description: "Remove CreatorStore branding",         valueType: "boolean" },
  { key: "max_websites",        description: "Maximum websites per account",         valueType: "integer" },
  { key: "max_team_members",    description: "Maximum team members per account",     valueType: "integer" },
  { key: "max_clients",         description: "Maximum managed clients (agencies)",   valueType: "integer" },
  { key: "white_label",         description: "White-label agency dashboard",         valueType: "boolean" },
  { key: "analytics_advanced",  description: "Advanced analytics and reports",       valueType: "boolean" },
  { key: "api_access",          description: "API access for integrations",          valueType: "boolean" },
  { key: "priority_support",    description: "Priority support channel",             valueType: "boolean" },
  { key: "ai_automation",       description: "AI-powered email and marketing",       valueType: "boolean" },
  { key: "storage_gb",          description: "Storage limit in GB",                  valueType: "integer" },
];

// ── PLAN DEFINITIONS ──────────────────────────────────────────────────────────

export const PLANS: PlanDefinition[] = [
  // ── Creator Plans ───────────────────────────────────────────────────────────
  {
    code: "creator_free",
    family: "creator",
    name: "Free Forever",
    description: "Everything you need to get started. No credit card required.",
    targetAudience: "New creators",
    price: 0,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Start Free",
    ctaType: "signup",
    features: {
      max_products: 5, custom_domain: false, custom_branding: false,
      max_websites: 1, max_team_members: 1, white_label: false,
      analytics_advanced: false, api_access: false, priority_support: false,
      ai_automation: false, storage_gb: 1,
    },
  },
  {
    code: "creator_pro",
    family: "creator",
    name: "Creator Pro",
    description: "For full-time creators ready to grow their business.",
    targetAudience: "Full-time creators",
    price: 999,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Get Started",
    ctaType: "checkout",
    recommended: true,
    badge: "Most Popular",
    features: {
      max_products: -1, custom_domain: true, custom_branding: true,
      max_websites: 1, max_team_members: 3, white_label: false,
      analytics_advanced: true, api_access: false, priority_support: true,
      ai_automation: true, storage_gb: 10,
    },
  },
  {
    code: "creator_elite",
    family: "creator",
    name: "Creator Elite",
    description: "For high-volume creators with teams and advanced needs.",
    targetAudience: "High-volume creators",
    price: 2999,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Get Started",
    ctaType: "checkout",
    features: {
      max_products: -1, custom_domain: true, custom_branding: true,
      max_websites: 3, max_team_members: 10, white_label: false,
      analytics_advanced: true, api_access: true, priority_support: true,
      ai_automation: true, storage_gb: 50,
    },
  },
  // ── Agency Plans ────────────────────────────────────────────────────────────
  {
    code: "agency_starter",
    family: "agency",
    name: "Agency Starter",
    description: "For small agencies managing a handful of creators.",
    targetAudience: "Small agencies",
    price: 1999,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Start Free",
    ctaType: "signup",
    features: {
      max_clients: 5, max_team_members: 3, max_products: -1,
      custom_domain: true, custom_branding: true, white_label: false,
      analytics_advanced: false, api_access: false, priority_support: false,
      ai_automation: false, storage_gb: 25,
    },
  },
  {
    code: "agency_growth",
    family: "agency",
    name: "Agency Growth",
    description: "For established agencies scaling their creator portfolio.",
    targetAudience: "Growing agencies",
    price: 4999,
    currency: "INR",
    cycle: "monthly",
    ctaLabel: "Get Started",
    ctaType: "checkout",
    recommended: true,
    badge: "Most Popular",
    features: {
      max_clients: 20, max_team_members: 10, max_products: -1,
      custom_domain: true, custom_branding: true, white_label: true,
      analytics_advanced: true, api_access: true, priority_support: true,
      ai_automation: true, storage_gb: 100,
    },
  },
];

/**
 * Reserved plan codes for future expansion.
 */
export const RESERVED_CODES = [
  "agency_enterprise", "addon_ai", "addon_storage", "addon_team", "addon_whitelabel",
] as const;
