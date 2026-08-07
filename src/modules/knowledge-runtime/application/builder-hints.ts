// ── Builder Integration Hints (Phase 7) ────────────────────
// The Builder highlights missing content next to the section it affects —
// contextual, non-intrusive, and always registry-derived. No popups: hints are
// rendered as a small panel in the builder's Website side.

import type { BuilderHint, KnowledgeSnapshot } from "../domain/types";
import { detectMissingFields } from "./analyzer";

const SEGMENTS: Array<{
  moduleId: string;
  title: string;
  severity: BuilderHint["severity"];
  when: (s: KnowledgeSnapshot) => boolean;
  message: (s: KnowledgeSnapshot) => string;
  href: string;
  fieldId: string;
}> = [
  {
    moduleId: "products",
    title: "No products yet",
    severity: "critical",
    when: (s) => s.commerce.productCount === 0,
    message: () => "Add your first product so visitors have something to buy.",
    href: "/admin/products",
    fieldId: "commerce.products",
  },
  {
    moduleId: "gallery",
    title: "Build a stronger portfolio",
    severity: "warning",
    when: (s) => s.content.galleryCount < 3,
    message: (s) => `Add ${Math.max(1, 3 - s.content.galleryCount)} more image${3 - s.content.galleryCount > 1 ? "s" : ""} for a stronger portfolio.`,
    href: "/admin/gallery",
    fieldId: "content.gallery",
  },
  {
    moduleId: "hero",
    title: "Improve your hero",
    severity: "info",
    when: (s) => s.identity.tagline.trim().length < 3,
    message: () => "Your hero could be improved with a tagline.",
    href: "/admin/settings",
    fieldId: "brand.tagline",
  },
  {
    moduleId: "hero",
    title: "Add hero media",
    severity: "warning",
    when: (s) => !s.media.heroMediaPresent,
    message: () => "Add a hero video or image — it's the first thing visitors see.",
    href: "/admin/settings",
    fieldId: "media.heroMedia",
  },
  {
    moduleId: "testimonials",
    title: "Build trust",
    severity: "warning",
    when: (s) => s.trust.testimonialCount === 0,
    message: () => "Add testimonials — social proof convinces undecided visitors.",
    href: "/admin/testimonials",
    fieldId: "trust.testimonials",
  },
  {
    moduleId: "courses",
    title: "Sell your knowledge",
    severity: "info",
    when: (s) => s.entityType === "educator" && s.commerce.courseCount === 0,
    message: () => "Educators convert best with a course listed on the page.",
    href: "/admin/courses",
    fieldId: "educator.courses",
  },
  {
    moduleId: "services",
    title: "List your services",
    severity: "info",
    when: (s) => s.entityType === "designer" && s.commerce.serviceCount === 0,
    message: () => "Designers win clients with a clear services list.",
    href: "/admin/services",
    fieldId: "designer.services",
  },
  {
    moduleId: "faq",
    title: "Answer common questions",
    severity: "info",
    when: (s) => s.content.faqCount === 0,
    message: () => "A short FAQ reduces friction for visitors.",
    href: "/admin/faq",
    fieldId: "content.faq",
  },
];

export function generateBuilderHints(snapshot: KnowledgeSnapshot): BuilderHint[] {
  return SEGMENTS
    .filter((segment) => segment.when(snapshot))
    .map((segment) => ({
      id: `hint_${segment.moduleId}_${segment.fieldId}`,
      moduleId: segment.moduleId,
      title: segment.title,
      message: segment.message(snapshot),
      severity: segment.severity,
      href: segment.href,
      fieldId: segment.fieldId,
    }));
}

/** Hints for sections currently visible in the builder layout. */
export function filterHintsForVisibleModules(hints: BuilderHint[], visibleModuleIds: string[]): BuilderHint[] {
  const visible = new Set(visibleModuleIds);
  return hints.filter((h) => visible.has(h.moduleId));
}

export function missingFieldSummary(snapshot: KnowledgeSnapshot): string[] {
  return detectMissingFields(snapshot).slice(0, 6).map((m) => m.label);
}
