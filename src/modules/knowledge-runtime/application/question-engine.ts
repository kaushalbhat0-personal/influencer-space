// ── Smart Question Engine (Phase 3) ────────────────────────
// Instead of long onboarding forms, ask only 3–5 questions — generated
// dynamically from what is actually missing. Questions are built from the
// category pack templates first, with a deterministic fallback derived from
// the registry field. Content that must be created (products, gallery,
// testimonials) becomes an "action" question that deep-links to the correct
// admin page.

import type {
  CategoryPack,
  CompletionQuestion,
  KnowledgeSnapshot,
  MissingField,
  PackQuestion,
} from "../domain/types";
import { getPack } from "../domain/category-packs";
import { detectMissingFields } from "./analyzer";

export const MAX_COMPLETION_QUESTIONS = 5;

const ACTION_FIELDS = new Set<string>([
  "identity.avatar",
  "identity.banner",
  "brand.logo",
  "business.domain",
  "media.heroMedia",
  "media.heroTitle",
  "commerce.products",
  "commerce.productDescriptions",
  "commerce.productImages",
  "commerce.services",
  "commerce.courses",
  "commerce.bookings",
  "content.gallery",
  "content.galleryQuality",
  "content.faq",
  "content.feed",
  "trust.testimonials",
  "trust.timeline",
  "social.feed",
  "social.affiliateLinks",
  "creator.affiliateLinks",
  "fitness.programs",
  "fitness.transformations",
  "restaurant.menu",
  "restaurant.reservations",
  "photographer.portfolio",
  "photographer.packages",
  "designer.caseStudies",
  "designer.services",
  "educator.courses",
]);

const DEFAULT_ACTION_LABEL: Record<string, string> = {
  "identity.avatar": "Upload a profile photo",
  "identity.banner": "Add a banner image",
  "brand.logo": "Add a logo",
  "business.domain": "Connect a domain",
  "media.heroMedia": "Add hero media",
  "media.heroTitle": "Set a hero title",
  "commerce.products": "Add your first product",
  "content.gallery": "Add portfolio images",
  "trust.testimonials": "Add a testimonial",
  "commerce.services": "Add a service",
  "commerce.courses": "Add a course",
  "commerce.bookings": "Enable bookings",
  "content.faq": "Add an FAQ",
  "social.affiliateLinks": "Add affiliate links",
  "creator.affiliateLinks": "Add affiliate links",
  "fitness.programs": "Add your programs",
  "restaurant.menu": "Add your menu",
  "photographer.packages": "Add your packages",
  "designer.services": "Add your services",
  "educator.courses": "Add your courses",
};

function toQuestion(missingField: MissingField, patch: Partial<CompletionQuestion>): CompletionQuestion {
  return {
    id: `q_${missingField.fieldId}`,
    fieldId: missingField.fieldId,
    category: missingField.category,
    prompt: patch.prompt ?? "",
    type: patch.type ?? "text",
    required: missingField.required,
    currentValue: missingField.currentValue,
    ...patch,
  };
}

function buildFromPackTemplate(template: PackQuestion, missingField: MissingField): CompletionQuestion {
  const isAction = template.type === "action" || ACTION_FIELDS.has(missingField.fieldId);
  return toQuestion(missingField, {
    prompt: template.prompt,
    type: isAction ? "action" : template.type,
    options: template.options,
    placeholder: template.placeholder,
    href: isAction ? missingField.href : undefined,
    actionLabel: DEFAULT_ACTION_LABEL[missingField.fieldId] ?? `Open ${missingField.label}`,
  });
}

function buildDefault(missingField: MissingField): CompletionQuestion {
  if (ACTION_FIELDS.has(missingField.fieldId)) {
    return toQuestion(missingField, {
      prompt: `We couldn't find your ${missingField.label.toLowerCase()}.`,
      type: "action",
      href: missingField.href,
      actionLabel: DEFAULT_ACTION_LABEL[missingField.fieldId] ?? `Open ${missingField.label}`,
    });
  }

  const options = defaultOptions(missingField.fieldId);
  const textarea = missingField.fieldId.startsWith("brand.") ||
    missingField.fieldId === "trust.achievements" ||
    missingField.fieldId === "business.hours";

  return toQuestion(missingField, {
    prompt: promptFor(missingField),
    type: options ? "choice" : textarea ? "textarea" : "text",
    options,
    placeholder: placeholderFor(missingField),
  });
}

function promptFor(field: MissingField): string {
  switch (field.fieldId) {
    case "identity.name":
      return "What should visitors call you?";
    case "brand.tagline":
      return "One line that sums up what you do?";
    case "brand.bio":
      return "Tell us your story — what do you do and who do you help?";
    case "brand.voice":
      return "How should your brand sound?";
    case "brand.mission":
      return "Why do you do what you do?";
    case "contact.email":
      return "Where should customers email you?";
    case "contact.phone":
      return "What's the best phone number to reach you?";
    case "contact.location":
      return "Where are you based?";
    case "contact.languages":
      return "Which languages do you serve your audience in?";
    case "social.primaryPlatform":
      return "Where do you post most?";
    case "trust.achievements":
      return "What are your biggest achievements?";
    case "seo.keywords":
      return "Which keywords should people find you with?";
    case "business.hours":
      return "When are you available?";
    default:
      return `We couldn't find your ${field.label.toLowerCase()}. Could you add it?`;
  }
}

function placeholderFor(field: MissingField): string {
  switch (field.fieldId) {
    case "brand.bio":
      return "e.g. I help beginners go from zero to consistent…";
    case "trust.achievements":
      return "e.g. 1M+ subscribers, winner of…";
    case "seo.keywords":
      return "e.g. fitness coach, workout plans, nutrition";
    case "business.hours":
      return "e.g. Mon–Sat, 9am–6pm";
    default:
      return field.label;
  }
}

function defaultOptions(fieldId: string) {
  switch (fieldId) {
    case "brand.voice":
      return [
        { label: "Professional", value: "Professional" },
        { label: "Casual", value: "Casual" },
        { label: "Playful", value: "Playful" },
        { label: "Inspirational", value: "Inspirational" },
      ];
    case "social.primaryPlatform":
      return [
        { label: "YouTube", value: "YouTube" },
        { label: "Instagram", value: "Instagram" },
        { label: "Twitch", value: "Twitch" },
        { label: "TikTok", value: "TikTok" },
        { label: "X / Twitter", value: "Twitter" },
        { label: "Other", value: "Other" },
      ];
    default:
      return undefined;
  }
}

/**
 * Generate the 3–5 smart completion questions for a snapshot. Pack templates
 * take priority; everything else is derived deterministically from the
 * registry, so no question is ever asked about data the profile already has.
 */
export function generateCompletionQuestions(
  snapshot: KnowledgeSnapshot,
  missing: MissingField[] = detectMissingFields(snapshot),
  pack: CategoryPack = getPack(snapshot.entityType),
): CompletionQuestion[] {
  const packTemplates = new Map(pack.questions.map((q) => [q.fieldId, q]));
  const questions: CompletionQuestion[] = [];
  const seen = new Set<string>();

  for (const missingField of missing) {
    if (questions.length >= MAX_COMPLETION_QUESTIONS) break;
    if (seen.has(missingField.fieldId)) continue;
    seen.add(missingField.fieldId);

    const template = packTemplates.get(missingField.fieldId);
    questions.push(template ? buildFromPackTemplate(template, missingField) : buildDefault(missingField));
  }

  return questions;
}
