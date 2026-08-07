// ── Category Packs (Phase 4) ───────────────────────────────
// Each entity type gets a different completion experience. Packs replace
// generic fields with entity-specific knowledge (a restaurant has a "menu",
// not "products") and provide entity-specific question templates. No generic
// onboarding — the runtime derives everything from these packs + the registry.

import type { CategoryPack, KnowledgeField, KnowledgeSnapshot } from "./types";
import { KNOWLEDGE_REGISTRY } from "./registry";

// ── Pack-specific fields ────────────────────────────────────
// These are registry-compatible fields. Where a pack field `replaces` a
// universal field, the universal field is excluded from scoring for that pack
// so no knowledge is double-counted ("No duplicate knowledge models").

export const PACK_FIELDS: KnowledgeField[] = [
  // Fitness
  {
    id: "fitness.programs",
    label: "Training Programs",
    category: "commerce",
    required: true,
    optional: false,
    priority: 1,
    aiRelevance: false,
    generationUsage: ["products", "commerce"],
    packs: ["fitness"],
    replaces: ["commerce.products"],
    href: "/admin/products",
    hint: "Publish your training programs so clients can buy them.",
    source: "table",
    complete: (s) => s.commerce.productCount >= 1,
  },
  {
    id: "fitness.transformations",
    label: "Client Transformations",
    category: "content",
    required: false,
    optional: true,
    priority: 2,
    aiRelevance: false,
    generationUsage: ["gallery", "trust"],
    packs: ["fitness"],
    replaces: ["content.gallery"],
    href: "/admin/gallery",
    hint: "Show before/after results in your gallery.",
    source: "table",
    complete: (s) => s.content.galleryCount >= 3,
  },
  {
    id: "fitness.certifications",
    label: "Trainer Certifications",
    category: "trust",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: true,
    generationUsage: ["about", "trust"],
    packs: ["fitness"],
    href: "/admin/knowledge",
    hint: "List your certifications (ACE, NASM, ISSA…) to build trust.",
    source: "declared",
    validation: { minLength: 5 },
    complete: (s) => typeof s.declared.fitness_certifications === "string" && s.declared.fitness_certifications.trim().length >= 5,
    value: (s) => s.declared.fitness_certifications,
  },

  // Restaurant
  {
    id: "restaurant.menu",
    label: "Menu",
    category: "commerce",
    required: true,
    optional: false,
    priority: 1,
    aiRelevance: false,
    generationUsage: ["products", "commerce"],
    packs: ["restaurant"],
    replaces: ["commerce.products"],
    href: "/admin/products",
    hint: "Put your menu online so hungry visitors can order.",
    source: "table",
    complete: (s) => s.commerce.productCount >= 1,
  },
  {
    id: "restaurant.reservations",
    label: "Reservations",
    category: "commerce",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: false,
    generationUsage: ["booking", "commerce"],
    packs: ["restaurant"],
    replaces: ["commerce.bookings"],
    href: "/admin/bookings",
    hint: "Enable table reservations from your site.",
    source: "table",
    complete: (s) => s.commerce.bookingCount >= 1,
  },
  {
    id: "restaurant.cuisine",
    label: "Cuisine",
    category: "business",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: false,
    generationUsage: ["about", "brand"],
    packs: ["restaurant"],
    href: "/admin/knowledge",
    hint: "What kind of food do you serve?",
    source: "declared",
    validation: { minLength: 2 },
    complete: (s) => typeof s.declared.restaurant_cuisine === "string" && s.declared.restaurant_cuisine.trim().length >= 2,
    value: (s) => s.declared.restaurant_cuisine,
  },
  {
    id: "restaurant.location",
    label: "Restaurant Location",
    category: "contact",
    required: true,
    optional: false,
    priority: 2,
    aiRelevance: false,
    generationUsage: ["contact", "seo"],
    packs: ["restaurant"],
    replaces: ["contact.location"],
    href: "/admin/profile",
    hint: "Visitors need your address to find you.",
    source: "setting",
    complete: (s) => s.contact.location.trim().length >= 2,
    value: (s) => s.contact.location,
  },

  // Photography
  {
    id: "photographer.portfolio",
    label: "Portfolio",
    category: "content",
    required: true,
    optional: false,
    priority: 1,
    aiRelevance: false,
    generationUsage: ["gallery", "trust"],
    packs: ["photography"],
    replaces: ["content.gallery"],
    href: "/admin/gallery",
    hint: "Your portfolio is your strongest sales tool.",
    source: "table",
    complete: (s) => s.content.galleryCount >= 3,
  },
  {
    id: "photographer.packages",
    label: "Pricing Packages",
    category: "commerce",
    required: true,
    optional: false,
    priority: 1,
    aiRelevance: false,
    generationUsage: ["products", "commerce"],
    packs: ["photography"],
    replaces: ["commerce.products"],
    href: "/admin/products",
    hint: "List your packages (wedding, portrait, events…).",
    source: "table",
    complete: (s) => s.commerce.productCount >= 1,
  },
  {
    id: "photographer.equipment",
    label: "Equipment",
    category: "business",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: false,
    generationUsage: ["about", "trust"],
    packs: ["photography"],
    href: "/admin/knowledge",
    hint: "Gear you shoot with (body, lenses, lights).",
    source: "declared",
    validation: { minLength: 5 },
    complete: (s) => typeof s.declared.photographer_equipment === "string" && s.declared.photographer_equipment.trim().length >= 5,
    value: (s) => s.declared.photographer_equipment,
  },

  // Designer (art & design)
  {
    id: "designer.caseStudies",
    label: "Case Studies",
    category: "content",
    required: true,
    optional: false,
    priority: 1,
    aiRelevance: false,
    generationUsage: ["gallery", "trust"],
    packs: ["designer"],
    replaces: ["content.gallery"],
    href: "/admin/gallery",
    hint: "Showcase your best client work.",
    source: "table",
    complete: (s) => s.content.galleryCount >= 3,
  },
  {
    id: "designer.services",
    label: "Design Services",
    category: "commerce",
    required: true,
    optional: false,
    priority: 1,
    aiRelevance: false,
    generationUsage: ["services", "commerce"],
    packs: ["designer"],
    replaces: ["commerce.services"],
    href: "/admin/services",
    hint: "List the services you offer (branding, web, print…).",
    source: "table",
    complete: (s) => s.commerce.serviceCount >= 1,
  },
  {
    id: "designer.tools",
    label: "Tools",
    category: "business",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: false,
    generationUsage: ["about", "trust"],
    packs: ["designer"],
    href: "/admin/knowledge",
    hint: "Software and tools you design with.",
    source: "declared",
    validation: { minLength: 5 },
    complete: (s) => typeof s.declared.designer_tools === "string" && s.declared.designer_tools.trim().length >= 5,
    value: (s) => s.declared.designer_tools,
  },
  {
    id: "designer.deliverables",
    label: "Deliverables",
    category: "business",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: false,
    generationUsage: ["about", "commerce"],
    packs: ["designer"],
    href: "/admin/knowledge",
    hint: "What clients receive (files, formats, revisions).",
    source: "declared",
    validation: { minLength: 5 },
    complete: (s) => typeof s.declared.designer_deliverables === "string" && s.declared.designer_deliverables.trim().length >= 5,
    value: (s) => s.declared.designer_deliverables,
  },

  // Educator (education)
  {
    id: "educator.courses",
    label: "Courses",
    category: "commerce",
    required: true,
    optional: false,
    priority: 1,
    aiRelevance: false,
    generationUsage: ["courses", "commerce"],
    packs: ["educator"],
    replaces: ["commerce.courses"],
    href: "/admin/courses",
    hint: "Publish the courses you teach.",
    source: "table",
    complete: (s) => s.commerce.courseCount >= 1,
  },
  {
    id: "educator.languages",
    label: "Teaching Languages",
    category: "contact",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: false,
    generationUsage: ["contact", "audience"],
    packs: ["educator"],
    replaces: ["contact.languages"],
    href: "/admin/profile",
    hint: "Languages you teach in.",
    source: "setting",
    complete: (s) => s.contact.languages.length >= 1,
    value: (s) => s.contact.languages,
  },
  {
    id: "educator.community",
    label: "Community",
    category: "business",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: false,
    generationUsage: ["about", "trust"],
    packs: ["educator"],
    href: "/admin/knowledge",
    hint: "Describe your student community (channels, size, support).",
    source: "declared",
    validation: { minLength: 10 },
    complete: (s) => typeof s.declared.educator_community === "string" && s.declared.educator_community.trim().length >= 10,
    value: (s) => s.declared.educator_community,
  },

  // Creator (gaming, music, film, lifestyle, general creators)
  {
    id: "creator.sponsors",
    label: "Sponsors",
    category: "business",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: false,
    generationUsage: ["about", "trust"],
    packs: ["creator"],
    href: "/admin/knowledge",
    hint: "Brands you have worked with or sponsors you represent.",
    source: "declared",
    validation: { minLength: 5 },
    complete: (s) => typeof s.declared.creator_sponsors === "string" && s.declared.creator_sponsors.trim().length >= 5,
    value: (s) => s.declared.creator_sponsors,
  },
  {
    id: "creator.affiliateLinks",
    label: "Affiliate Links",
    category: "social",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: false,
    generationUsage: ["links", "commerce"],
    packs: ["creator"],
    replaces: ["social.affiliateLinks"],
    href: "/admin/links",
    hint: "Recommend products you use and earn commission.",
    source: "table",
    complete: (s) => s.social.affiliateLinkCount >= 1,
  },
  {
    id: "creator.resources",
    label: "Resources",
    category: "content",
    required: false,
    optional: true,
    priority: 3,
    aiRelevance: false,
    generationUsage: ["content", "links"],
    packs: ["creator"],
    href: "/admin/knowledge",
    hint: "Free resources, downloads or tools you share with fans.",
    source: "declared",
    validation: { minLength: 10 },
    complete: (s) => typeof s.declared.creator_resources === "string" && s.declared.creator_resources.trim().length >= 10,
    value: (s) => s.declared.creator_resources,
  },
];

// ── Packs ───────────────────────────────────────────────────

export const CATEGORY_PACKS: CategoryPack[] = [
  {
    id: "fitness",
    name: "Fitness Trainer",
    entityType: "fitness",
    applicability: ["fitness"],
    fields: ["fitness.programs", "fitness.transformations", "fitness.certifications"],
    description: "Fitness creators sell programs, show transformations and prove their certifications.",
    questions: [
      { fieldId: "fitness.programs", prompt: "What training programs do you offer?", type: "action" },
      { fieldId: "fitness.transformations", prompt: "Add before/after transformations to your portfolio.", type: "action" },
      { fieldId: "fitness.certifications", prompt: "List your trainer certifications.", type: "textarea", placeholder: "e.g. ACE Certified, NASM, ISSA" },
    ],
  },
  {
    id: "restaurant",
    name: "Restaurant",
    entityType: "restaurant",
    applicability: ["restaurant"],
    fields: ["restaurant.menu", "restaurant.reservations", "restaurant.cuisine", "restaurant.location"],
    description: "Restaurants need a menu, cuisine, reservations and a location.",
    questions: [
      { fieldId: "restaurant.menu", prompt: "What's on your menu?", type: "action" },
      { fieldId: "restaurant.cuisine", prompt: "What cuisine do you serve?", type: "text", placeholder: "e.g. North Indian, Italian, Sushi" },
      { fieldId: "restaurant.reservations", prompt: "Do you take reservations?", type: "choice", options: [
        { label: "Yes", value: "yes" }, { label: "No", value: "no" },
      ] },
    ],
  },
  {
    id: "photography",
    name: "Photographer",
    entityType: "photography",
    applicability: ["photography"],
    fields: ["photographer.portfolio", "photographer.packages", "photographer.equipment"],
    description: "Photographers convert through a strong portfolio and clear packages.",
    questions: [
      { fieldId: "photographer.portfolio", prompt: "Add your best shots to your portfolio.", type: "action" },
      { fieldId: "photographer.packages", prompt: "List your pricing packages.", type: "action" },
      { fieldId: "photographer.equipment", prompt: "What equipment do you shoot with?", type: "textarea", placeholder: "e.g. Canon R5, 70-200mm f/2.8" },
    ],
  },
  {
    id: "designer",
    name: "Designer",
    entityType: "designer",
    applicability: ["art"],
    fields: ["designer.caseStudies", "designer.services", "designer.tools", "designer.deliverables"],
    description: "Designers win clients with case studies, services and clear deliverables.",
    questions: [
      { fieldId: "designer.caseStudies", prompt: "Showcase your best client work.", type: "action" },
      { fieldId: "designer.services", prompt: "List the design services you offer.", type: "action" },
      { fieldId: "designer.tools", prompt: "What tools do you design with?", type: "textarea", placeholder: "e.g. Figma, Photoshop, Blender" },
      { fieldId: "designer.deliverables", prompt: "What do clients receive?", type: "textarea", placeholder: "e.g. 3 concepts, 2 revisions, source files" },
    ],
  },
  {
    id: "educator",
    name: "Educator",
    entityType: "educator",
    applicability: ["education"],
    fields: ["educator.courses", "educator.languages", "educator.community"],
    description: "Educators sell courses, teach in multiple languages and grow a community.",
    questions: [
      { fieldId: "educator.courses", prompt: "Publish the courses you teach.", type: "action" },
      { fieldId: "educator.languages", prompt: "Which languages do you teach in?", type: "multichoice", options: [
        { label: "English", value: "English" }, { label: "Hindi", value: "Hindi" },
        { label: "Tamil", value: "Tamil" }, { label: "Telugu", value: "Telugu" },
        { label: "Bengali", value: "Bengali" }, { label: "Other", value: "Other" },
      ]},
      { fieldId: "educator.community", prompt: "Describe your student community.", type: "textarea", placeholder: "e.g. 40k students on YouTube, weekly live doubt sessions" },
    ],
  },
  {
    id: "creator",
    name: "Creator",
    entityType: "creator",
    applicability: ["gaming", "music", "film", "celebrity", "comedy", "lifestyle", "travel", "food", "sports", "news", "technology", "finance", "business", "general"],
    fields: ["creator.sponsors", "creator.affiliateLinks", "creator.resources"],
    description: "Creators monetise through sponsors, affiliate links and free resources.",
    questions: [
      { fieldId: "creator.sponsors", prompt: "Which brands have you worked with?", type: "textarea", placeholder: "e.g. Nike, AMD, Logitech" },
      { fieldId: "creator.affiliateLinks", prompt: "Add products you recommend as affiliate links.", type: "action" },
      { fieldId: "creator.resources", prompt: "Share free resources your fans love.", type: "textarea", placeholder: "e.g. free presets, wallpapers, templates" },
    ],
  },
];

export const DEFAULT_PACK_ID = "creator";

/** Resolve a category pack from an onboarding category value. */
export function resolvePack(entityType: string): CategoryPack {
  const normalized = entityType?.trim().toLowerCase() || "";
  const pack = CATEGORY_PACKS.find((p) => p.applicability.includes(normalized));
  if (pack) return pack;
  const fallback = CATEGORY_PACKS.find((p) => p.id === DEFAULT_PACK_ID);
  return fallback ?? CATEGORY_PACKS[0]!;
}

export function getPack(packId: string): CategoryPack {
  return CATEGORY_PACKS.find((p) => p.id === packId) ?? resolvePack(DEFAULT_PACK_ID);
}

/**
 * The fields that apply to a pack: universal fields not replaced by the pack,
 * plus the pack's own fields. This is the single source used by scoring,
 * analysis, questions and hints — everything derives from it.
 */
export function applicableFieldsForPack(packId: string): KnowledgeField[] {
  const pack = getPack(packId);
  const replaced = new Set(pack.fields.flatMap((id) => {
    const field = PACK_FIELDS.find((f) => f.id === id);
    return field?.replaces ?? [];
  }));
  const universal = KNOWLEDGE_REGISTRY.filter((f) => !replaced.has(f.id));
  const packOnly = PACK_FIELDS.filter((f) => f.packs?.includes(pack.id));
  return [...universal, ...packOnly];
}

/** Score a snapshot against a pack. */
export function applicableForSnapshot(snapshot: KnowledgeSnapshot): KnowledgeField[] {
  return applicableFieldsForPack(snapshot.entityType);
}

export const ALL_FIELDS: KnowledgeField[] = [...KNOWLEDGE_REGISTRY, ...PACK_FIELDS];
