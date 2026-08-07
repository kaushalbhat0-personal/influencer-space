// ── Knowledge Completion Runtime — Domain Types ──────────────
// RCCF-EPIC-04. The Knowledge Completion Runtime measures how much we
// know about a creator profile, reports only what is missing, and guides
// the creator (and the generation pipeline) toward a complete business
// profile — without asking 30 onboarding questions and without inventing
// facts.

/** Canonical knowledge categories scored by the runtime. */
export type KnowledgeCategory =
  | "brand"
  | "business"
  | "commerce"
  | "content"
  | "identity"
  | "trust"
  | "media"
  | "seo"
  | "contact"
  | "social";

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  brand: "Brand",
  business: "Business",
  commerce: "Commerce",
  content: "Content",
  identity: "Identity",
  trust: "Trust",
  media: "Media",
  seo: "SEO",
  contact: "Contact",
  social: "Social",
};

/**
 * Where a field's value comes from. Declared facts are user-confirmed values
 * collected by the Completion Engine (never AI-invented).
 */
export type FieldSource = "aggregate" | "setting" | "table" | "declared";

/** Validation rules applied to user-supplied answers by the Completion Engine. */
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  minCount?: number;
}

export interface KnowledgeField {
  /** Canonical id, e.g. "brand.tagline". Everything derives from this registry. */
  id: string;
  label: string;
  category: KnowledgeCategory;
  /** Required for a premium business profile (used for scoring). */
  required: boolean;
  /** Explicit optional flag (registry contract — mirror of required). */
  optional: boolean;
  /** 1 = highest impact on storefront quality. */
  priority: 1 | 2 | 3 | 4 | 5;
  /** Whether AI may assist (rewrite/summarize/improve/expand) this field. */
  aiRelevance: boolean;
  /** Which generation-pipeline stages consume this field. */
  generationUsage: string[];
  /** Category packs (Phase 4) this field belongs to. Absent = universal. */
  packs?: string[];
  /**
   * Universal field ids this pack-specific field replaces for its pack.
   * Prevents duplicate knowledge models: a restaurant "menu" and a creator's
   * "products" both live in the Product table but are scored once, under the
   * entity-specific id.
   */
  replaces?: string[];
  /** Admin deep-link used to complete this field. */
  href: string;
  /** Short guidance shown next to the missing field. */
  hint: string;
  source: FieldSource;
  validation?: FieldValidation;
  /** Whether the field is complete for the given snapshot. */
  complete: (snapshot: KnowledgeSnapshot) => boolean;
  /** Current value (for pre-filling questions / display). */
  value?: (snapshot: KnowledgeSnapshot) => unknown;
}

/**
 * Flattened, read-only projection of everything the runtime knows about a
 * creator's persisted storefront. Built by infrastructure/aggregate-source.ts
 * from the WebsiteAggregate plus a small number of direct queries. Registry
 * fields read ONLY from this object, keeping scoring pure and testable.
 */
export interface KnowledgeSnapshot {
  identity: {
    name: string;
    tagline: string;
    bio: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
  };
  brand: {
    logoUrl: string | null;
    customTheme: boolean;
  };
  commerce: {
    productCount: number;
    productsWithDescription: number;
    productsWithImage: number;
    offersPriced: number;
    offerCount: number;
    serviceCount: number;
    courseCount: number;
    bookingCount: number;
  };
  content: {
    galleryCount: number;
    galleryWithTitle: number;
    galleryWithAltText: number;
    faqCount: number;
    feedCount: number;
  };
  trust: {
    testimonialCount: number;
    timelineCount: number;
    gameCount: number;
  };
  media: {
    heroMediaPresent: boolean;
    heroTitlePresent: boolean;
  };
  seo: {
    title: string;
    description: string;
  };
  contact: {
    email: string;
    phone: string;
    location: string;
    languages: string[];
    businessHours: string[];
  };
  social: {
    socialLinkCount: number;
    primaryPlatform: string;
    feedConnected: boolean;
    affiliateLinkCount: number;
  };
  business: {
    customDomain: string | null;
    subdomain: string | null;
  };
  /** Declared facts stored under the `knowledge_completion` setting. */
  declared: Record<string, unknown>;
  /** Resolved category-pack id (e.g. "fitness", "creator"). */
  entityType: string;
}

/** A single missing piece of knowledge (Phase 2). */
export interface MissingField {
  fieldId: string;
  label: string;
  category: KnowledgeCategory;
  required: boolean;
  priority: number;
  href: string;
  hint: string;
  aiRelevance: boolean;
  currentValue?: unknown;
}

export interface CategoryScore {
  id: KnowledgeCategory;
  label: string;
  /** 0-100, priority-weighted within the category. */
  percent: number;
  completeCount: number;
  totalCount: number;
  missing: MissingField[];
}

export interface KnowledgeScore {
  /** 0-100 overall, priority-weighted across all applicable fields. */
  overall: number;
  categories: CategoryScore[];
  /** 0-1 — how much of the assessment rests on verified sources. */
  confidence: number;
  completeFields: string[];
  missingFields: MissingField[];
  generatedAt: string;
  entityType: string;
}

export type QuestionType = "text" | "textarea" | "choice" | "multichoice" | "action";

export interface QuestionOption {
  label: string;
  value: string;
}

export interface CompletionQuestion {
  id: string;
  fieldId: string;
  category: KnowledgeCategory;
  prompt: string;
  detail?: string;
  type: QuestionType;
  options?: QuestionOption[];
  placeholder?: string;
  required: boolean;
  /** Deep-link used by "action" questions. */
  href?: string;
  actionLabel?: string;
  currentValue?: unknown;
}

export interface CompletionAnswer {
  fieldId: string;
  value: unknown;
}

export interface CategoryPack {
  id: string;
  name: string;
  entityType: string;
  /** Onboarding category values that resolve to this pack. */
  applicability: string[];
  /** Pack-specific field ids (universal fields are always applied). */
  fields: string[];
  description: string;
  /** Pack-specific question templates. */
  questions: PackQuestion[];
}

export interface PackQuestion {
  fieldId: string;
  prompt: string;
  type: QuestionType;
  options?: QuestionOption[];
  placeholder?: string;
}

export type StorefrontDimensionId =
  | "knowledge"
  | "content"
  | "commerce"
  | "brand"
  | "seo"
  | "trust"
  | "accessibility"
  | "goal-alignment";

export interface StorefrontDimension {
  id: StorefrontDimensionId;
  label: string;
  score: number;
}

export interface StorefrontScore {
  dimensions: StorefrontDimension[];
  overall: number;
}

export type BuilderHintSeverity = "info" | "warning" | "critical";

export interface BuilderHint {
  id: string;
  /** Builder section module id (e.g. "products", "gallery", "hero"). */
  moduleId: string;
  title: string;
  message: string;
  severity: BuilderHintSeverity;
  href: string;
  fieldId?: string;
}

export interface KnowledgeCompletionRecord {
  packId: string;
  updatedAt: string;
  facts: Record<string, unknown>;
}
