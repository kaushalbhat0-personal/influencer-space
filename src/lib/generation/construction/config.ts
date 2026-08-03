/**
 * Storefront Construction Model — IMPLEMENTATION-29.
 *
 * Configuration-driven construction of the live storefront preview. Each step
 * declares WHICH generation stage must actually complete before the storefront
 * portion may appear. The Construction Runtime (runtime.ts) derives status from
 * the real Generation Experience — nothing here is hardcoded in components and
 * nothing is ever simulated.
 */
import type { GenerationStageId } from "@/lib/generation/experience/stages";

export type ConstructionStepId =
  | "shell"
  | "profile"
  | "nav"
  | "hero"
  | "products"
  | "services"
  | "testimonials"
  | "faq"
  | "content"
  | "footer";

export interface ConstructionStepConfig {
  id: ConstructionStepId;
  title: string;
  description: string;
  /** Stage that must COMPLETE before this portion of the storefront appears. */
  dependsOnStage: GenerationStageId | null;
  /** Snapshot module prefixes revealed when this step completes. */
  reveals: string[];
  /** Reveal animation. "crossfade" for placeholder→real swaps. */
  animation: "fade-in" | "crossfade" | "none";
  /** Element rendered in the preview when NOT yet eligible (key for skeleton). */
  skeleton: "nav" | "hero" | "grid" | "stack" | "footer" | "none";
}

/** The canonical construction sequence (order matters for current-step UX). */
export const CONSTRUCTION_STEPS: ConstructionStepConfig[] = [
  {
    id: "shell",
    title: "Preparing workspace",
    description: "Setting up the page foundation",
    dependsOnStage: null,
    reveals: [],
    animation: "fade-in",
    skeleton: "none",
  },
  {
    id: "profile",
    title: "Creator profile imported",
    description: "Identity, avatar and socials linked",
    dependsOnStage: "import_profile",
    reveals: [],
    animation: "fade-in",
    skeleton: "none",
  },
  {
    id: "nav",
    title: "Navigation assembled",
    description: "Site structure and menu",
    dependsOnStage: "experience_planning",
    reveals: ["nav"],
    animation: "fade-in",
    skeleton: "nav",
  },
  {
    id: "hero",
    title: "Hero composed",
    description: "Hero section and media",
    dependsOnStage: "composition",
    reveals: ["hero"],
    animation: "crossfade",
    skeleton: "hero",
  },
  {
    id: "products",
    title: "Products placed",
    description: "Product grid",
    dependsOnStage: "artifact_generation",
    reveals: ["products"],
    animation: "fade-in",
    skeleton: "grid",
  },
  {
    id: "services",
    title: "Services placed",
    description: "Service offerings",
    dependsOnStage: "artifact_generation",
    reveals: ["services"],
    animation: "fade-in",
    skeleton: "stack",
  },
  {
    id: "testimonials",
    title: "Social proof placed",
    description: "Testimonials and reviews",
    dependsOnStage: "artifact_generation",
    reveals: ["testimonials"],
    animation: "fade-in",
    skeleton: "grid",
  },
  {
    id: "faq",
    title: "FAQ placed",
    description: "Frequently asked questions",
    dependsOnStage: "artifact_generation",
    reveals: ["faq"],
    animation: "fade-in",
    skeleton: "stack",
  },
  {
    id: "content",
    title: "Content assembled",
    description: "Gallery, pricing, links and more",
    dependsOnStage: "artifact_generation",
    reveals: ["gallery", "pricing", "links", "courses", "games", "contentFeed", "timeline", "contact", "newsletter"],
    animation: "fade-in",
    skeleton: "grid",
  },
  {
    id: "footer",
    title: "Footer finalized",
    description: "Footer and social links",
    dependsOnStage: "publishing",
    reveals: ["footer"],
    animation: "fade-in",
    skeleton: "footer",
  },
];

/**
 * The generation stage whose completion gates applying the RUNTIME theme
 * (typography, colors, spacing) to the construction preview. Uses the real
 * composition stage — the workflow stage that selects/assembles the theme.
 */
export const CONSTRUCTION_THEME_DEPENDS_ON: GenerationStageId = "composition";
