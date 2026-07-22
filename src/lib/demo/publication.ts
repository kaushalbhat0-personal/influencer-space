/**
 * Demo Publishing Pipeline
 *
 * Controlled workflow for moving generated demos through
 * draft → review → approve → publish → feature → archive.
 */

import { DEMO_SEEDS } from "./seeds";
import { SHOWCASE_REGISTRY } from "./showcase";
import { buildStorefrontUrl } from "@/lib/config/platform";

export type PublicationStatus = "draft" | "review" | "approved" | "published" | "featured" | "archived";

export interface DemoPublication {
  seedId: string;
  status: PublicationStatus;
  storefrontUrl?: string;
  publishedAt?: string;
  reviewedBy?: string;
  approvedBy?: string;
  featuredAt?: string;
  archivedAt?: string;
  notes?: string;
}

export interface ValidationResult {
  valid: boolean;
  checks: { label: string; passed: boolean; }[];
}

const LEGAL_TRANSITIONS: Record<PublicationStatus, PublicationStatus[]> = {
  draft:     ["review", "archived"],
  review:    ["approved", "draft", "archived"],
  approved:  ["published", "draft", "archived"],
  published: ["featured", "archived"],
  featured:  ["published", "archived"],
  archived:  ["draft"],
};

export function canTransition(from: PublicationStatus, to: PublicationStatus): boolean {
  return LEGAL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function validatePublication(seedId: string): ValidationResult {
  const seed = DEMO_SEEDS.find((s) => s.id === seedId);
  if (!seed) return { valid: false, checks: [{ label: "Seed exists", passed: false }] };

  return {
    valid: true,
    checks: [
      { label: "Hero section", passed: !!seed.content.hero },
      { label: "About section", passed: !!seed.content.about },
      { label: "Products (min 1)", passed: seed.products.length > 0 },
      { label: "Testimonials (min 1)", passed: seed.testimonials.length > 0 },
      { label: "FAQ (min 1)", passed: seed.faq.length > 0 },
      { label: "SEO metadata", passed: !!seed.content.seoTitle && !!seed.content.seoDesc },
      { label: "Brand palette", passed: !!seed.brand.palette.primary },
      { label: "Pages defined", passed: seed.pages.length > 0 },
    ],
  };
}

const publications = new Map<string, DemoPublication>();

export function getPublication(seedId: string): DemoPublication {
  const existing = publications.get(seedId);
  if (existing) return existing;
  const showcase = SHOWCASE_REGISTRY.find((s) => s.seedId === seedId);
  const initial: DemoPublication = {
    seedId,
    status: showcase?.published ? "published" : "draft",
    storefrontUrl: buildStorefrontUrl(seedId),
  };
  publications.set(seedId, initial);
  return initial;
}

export function setPublication(seedId: string, pub: DemoPublication): void {
  publications.set(seedId, pub);
}

export function transitionPublication(seedId: string, to: PublicationStatus): { success: boolean; error?: string } {
  const current = getPublication(seedId);
  if (!canTransition(current.status, to)) {
    return { success: false, error: `Cannot transition from "${current.status}" to "${to}"` };
  }
  const next: DemoPublication = { ...current, status: to };
  if (to === "published") next.publishedAt = new Date().toISOString();
  if (to === "featured") next.featuredAt = new Date().toISOString();
  if (to === "archived") next.archivedAt = new Date().toISOString();
  publications.set(seedId, next);
  return { success: true };
}

export function getAllPublications(): (DemoPublication & { industry: string })[] {
  return DEMO_SEEDS.map((seed) => {
    const pub = getPublication(seed.id);
    return { ...pub, industry: seed.industry };
  });
}

export function getAllowedTransitions(status: PublicationStatus): PublicationStatus[] {
  return LEGAL_TRANSITIONS[status] ?? [];
}
