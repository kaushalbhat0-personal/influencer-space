/**
 * Intelligence Runtime — RCCF-EPIC-03
 *
 * Deterministic, cache-first, template-first. AI is the last resort.
 * One router decides whether AI is needed. One cache stores all outputs.
 * One copy runtime provides deterministic templates for every niche.
 *
 * Target: 80%+ deterministic/template/cache. <20% AI-generated.
 */

import { captureError } from "@/lib/observability/error-tracker";

// ── AI Router ──────────────────────────────────────────────────

type AITaskType = "brand" | "hero" | "about" | "faq" | "seo" | "products" | "cta" | "copy";

interface AIRouterDecision {
  shouldUseAI: boolean;
  reason: "cache_hit" | "template_available" | "deterministic_possible" | "ai_required" | "manual_request";
  cacheKey?: string;
  templateId?: string;
}

/** Single gateway for all AI decisions. No component calls AI directly. */
export const aiRouter = {
  decide(
    task: AITaskType,
    context: { creatorId?: string; niche?: string; hasCache?: boolean; manualRequest?: boolean; confidence?: number },
  ): AIRouterDecision {
    // Manual regenerate request → always AI
    if (context.manualRequest) return { shouldUseAI: true, reason: "manual_request" };

    // Cache hit → skip AI
    if (context.hasCache) {
      const cacheKey = buildCacheKey(task, context.creatorId);
      return { shouldUseAI: false, reason: "cache_hit", cacheKey };
    }

    // Templates available → skip AI
    const templateId = getTemplateForTask(task, context.niche);
    if (templateId) return { shouldUseAI: false, reason: "template_available", templateId };

    // High confidence deterministic → skip AI
    if ((context.confidence ?? 0) > 0.7) return { shouldUseAI: false, reason: "deterministic_possible" };

    // Everything else → AI required
    return { shouldUseAI: true, reason: "ai_required" };
  },

  /** Fast check — should we even consider AI? */
  shouldSkip(task: AITaskType, context: { niche?: string }): boolean {
    return isDeterministicOnly(task) || hasTemplate(task, context.niche);
  },
};

// ── Cache Runtime ─────────────────────────────────────────────

interface CacheEntry {
  key: string;
  value: string | Record<string, unknown>;
  task: AITaskType;
  creatorId: string;
  knowledgeHash: string;
  promptVersion: number;
  createdAt: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
// RCCF-LAUNCH-01: bound memory (was unbounded — never-accessed keys and the
// cost of an ever-growing Map on long-lived serverless instances).
const MAX_CACHE_ENTRIES = 1000;

function sweepExpired(): void {
  if (cache.size < MAX_CACHE_ENTRIES) return;
  const now = Date.now();
  for (const [key, entry] of Array.from(cache.entries())) {
    if (now - entry.createdAt > entry.ttl) cache.delete(key);
  }
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = Array.from(cache.entries()).sort((a, b) => a[1].createdAt - b[1].createdAt)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

export const cacheRuntime = {
  get(task: AITaskType, creatorId: string, knowledgeHash: string): CacheEntry | undefined {
    const key = buildCacheKey(task, creatorId);
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (entry.knowledgeHash !== knowledgeHash) { cache.delete(key); return undefined; }
    if (Date.now() - entry.createdAt > entry.ttl) { cache.delete(key); return undefined; }
    return entry;
  },

  set(task: AITaskType, creatorId: string, knowledgeHash: string, value: string | Record<string, unknown>, ttl = DEFAULT_TTL): void {
    sweepExpired();
    cache.set(buildCacheKey(task, creatorId), {
      key: buildCacheKey(task, creatorId), value, task, creatorId, knowledgeHash,
      promptVersion: 1, createdAt: Date.now(), ttl,
    });
  },

  invalidate(creatorId: string): void {
    for (const [key, entry] of Array.from(cache.entries())) {
      if (entry.creatorId === creatorId) cache.delete(key);
    }
  },

  size(): number { return cache.size; },
  stats() {
    let hits = 0; let total = 0;
    for (const [, entry] of Array.from(cache.entries())) { total++; if (entry.value) hits++; }
    return { entries: cache.size, hitRate: total > 0 ? Math.round(hits / total * 100) : 0 };
  },
};

function buildCacheKey(task: AITaskType, creatorId?: string): string {
  return `${creatorId ?? "anonymous"}_${task}_v1`;
}

// ── Deterministic Copy Runtime ────────────────────────────────

interface CopyTemplate {
  id: string;
  niche: string;
  hero: string;
  about: string;
  cta: string;
  seoTitle: string;
  seoDescription: string;
  productsIntro: string;
}

const COPY_TEMPLATES: Record<string, CopyTemplate> = {
  fitness: {
    id: "fitness", niche: "fitness",
    hero: "Transform your body. Transform your life.",
    about: "I'm a certified fitness coach helping busy professionals achieve their health goals through personalised coaching, nutrition plans, and accountability.",
    cta: "Start Your Transformation",
    seoTitle: "Fitness Coach — Online Personal Training & Nutrition Plans",
    seoDescription: "Certified fitness coach offering personalised training programs, nutrition plans, and online coaching to help you achieve your health goals.",
    productsIntro: "Programs & Plans",
  },
  restaurant: {
    id: "restaurant", niche: "restaurant",
    hero: "Flavors worth sharing.",
    about: "We serve authentic cuisine made from fresh, locally-sourced ingredients. Every dish tells a story of tradition and passion.",
    cta: "View Our Menu",
    seoTitle: "Restaurant — Fresh & Authentic Dining Experience",
    seoDescription: "Authentic cuisine made from fresh, locally-sourced ingredients. Reserve your table today.",
    productsIntro: "Our Menu",
  },
  photographer: {
    id: "photographer", niche: "photography",
    hero: "Moments captured. Memories preserved.",
    about: "I specialise in portrait, wedding, and commercial photography. Every shot tells a story — let me tell yours.",
    cta: "View Portfolio",
    seoTitle: "Professional Photographer — Portrait, Wedding & Commercial Photography",
    seoDescription: "Professional photography services specialising in portraits, weddings, and commercial shoots.",
    productsIntro: "Photography Packages",
  },
  musician: {
    id: "musician", niche: "music",
    hero: "Sound that moves you.",
    about: "I create music that connects. From studio recordings to live performances, every note is crafted with intention.",
    cta: "Listen Now",
    seoTitle: "Musician — Studio Recordings & Live Performances",
    seoDescription: "Original music, studio recordings, and live performances. Listen and connect.",
    productsIntro: "Music & Merch",
  },
  developer: {
    id: "developer", niche: "technology",
    hero: "Code that builds the future.",
    about: "I'm a developer building tools, apps, and platforms that solve real problems. From open-source projects to client work, code is my craft.",
    cta: "See My Work",
    seoTitle: "Software Developer — Apps, Tools & Open Source",
    seoDescription: "Full-stack developer building tools, applications, and open-source projects.",
    productsIntro: "Templates & Tools",
  },
  educator: {
    id: "educator", niche: "education",
    hero: "Knowledge that transforms.",
    about: "I help students and professionals master new skills through structured courses, hands-on practice, and personalised guidance.",
    cta: "Start Learning",
    seoTitle: "Educator — Online Courses & Personalised Learning",
    seoDescription: "Expert-led online courses and personalised learning programs to help you master new skills.",
    productsIntro: "Courses & Resources",
  },
  creator: {
    id: "creator", niche: "creator",
    hero: "Create. Connect. Grow.",
    about: "I create content that inspires, educates, and entertains. Join my community and be part of something bigger.",
    cta: "Join the Community",
    seoTitle: "Content Creator — Videos, Courses & Community",
    seoDescription: "Content creator sharing videos, courses, and exclusive content for my community.",
    productsIntro: "Content & Merch",
  },
};

function getTemplateForTask(task: AITaskType, niche?: string): string | undefined {
  const template = niche ? COPY_TEMPLATES[niche] : undefined;
  if (!template) return undefined;
  switch (task) {
    case "hero": return template.hero;
    case "about": return template.about;
    case "cta": return template.cta;
    case "seo": return `${niche}_seo`;
    default: return undefined;
  }
}

function isDeterministicOnly(task: AITaskType): boolean {
  // These tasks should NEVER use AI
  return ["faq", "privacy", "terms", "refund"].includes(task);
}

function hasTemplate(task: AITaskType, niche?: string): boolean {
  if (!niche) return false;
  const t = COPY_TEMPLATES[niche];
  if (!t) return false;
  return task === "hero" || task === "about" || task === "cta" || task === "seo";
}

// ── Copy Runner ───────────────────────────────────────────────

export function getCopy(
  task: AITaskType,
  context: { niche?: string; creatorName?: string; customInput?: string },
): string {
  const template = context.niche ? COPY_TEMPLATES[context.niche] : undefined;
  const fallback = (field: keyof CopyTemplate) => template?.[field] ?? getDefaultCopy(task);

  switch (task) {
    case "hero": return fallback("hero").replace("{creatorName}", context.creatorName ?? "Creator");
    case "about": return fallback("about").replace("{creatorName}", context.creatorName ?? "Creator");
    case "cta": return fallback("cta");
    case "seo": return context.customInput ?? fallback("seoTitle");
    case "products": return fallback("productsIntro");
    default: return getDefaultCopy(task);
  }
}

function getDefaultCopy(task: AITaskType): string {
  const defaults: Record<string, string> = {
    hero: "Build your creator business with CreatorStore.",
    about: "Welcome to my storefront.",
    cta: "Get Started",
    seo: "CreatorStore — Your creator business platform.",
    products: "Products",
    faq: "Frequently asked questions",
    brand: "Creator",
    copy: "",
  };
  return defaults[task] ?? "";
}

// ── Cost Monitor ──────────────────────────────────────────────

interface CostRecord {
  task: AITaskType;
  creatorId?: string;
  tokens: number;
  cost: number;
  provider: string;
  cached: boolean;
  timestamp: number;
}

const costLog: CostRecord[] = [];
const ESTIMATED_COST_PER_1K_TOKENS = 0.002;

export const costMonitor = {
  record(entry: Omit<CostRecord, "cost" | "timestamp" | "cached">, wasCached = false): void {
    // VALIDATION-05: cap the in-memory log (was unbounded — a long-lived
    // serverless instance grew forever).
    if (costLog.length >= 1000) costLog.shift();
    costLog.push({
      ...entry,
      cost: (entry.tokens / 1000) * ESTIMATED_COST_PER_1K_TOKENS,
      cached: wasCached,
      timestamp: Date.now(),
    });
  },

  getSummary() {
    const total = costLog.length;
    const cached = costLog.filter((c) => c.cached).length;
    const totalCost = costLog.reduce((s, c) => s + c.cost, 0);
    const totalTokens = costLog.reduce((s, c) => s + c.tokens, 0);
    return { totalCalls: total, cachedCalls: cached, cacheHitRate: total > 0 ? Math.round(cached / total * 100) : 100, totalCost, totalTokens };
  },

  getPerTask() {
    const tasks = new Map<string, { calls: number; tokens: number; cost: number }>();
    for (const entry of costLog) {
      const t = tasks.get(entry.task) ?? { calls: 0, tokens: 0, cost: 0 };
      t.calls++; t.tokens += entry.tokens; t.cost += entry.cost;
      tasks.set(entry.task, t);
    }
    return Array.from(tasks.entries()).map(([task, stats]) => ({ task, ...stats }));
  },

  getLog(limit = 50) { return costLog.slice(-limit).reverse(); },
};
