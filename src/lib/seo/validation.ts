import {
  SEO_TITLE_MIN, SEO_TITLE_MAX,
  SEO_DESCRIPTION_MIN, SEO_DESCRIPTION_MAX,
  OG_TITLE_MAX, OG_DESCRIPTION_MAX,
  TWITTER_TITLE_MAX,
  SLUG_MAX,
} from "./constants";
import type { SEOValidationResult, ValidationRuleConfig } from "./types";
import { ValidationRuleRegistry } from "./validation-registry";

export type { ValidationRuleConfig, ValidationRuleRegistry };

function titleRule(): ValidationRuleConfig {
  return {
    id: "title_length",
    label: "SEO Title Length",
    category: "content",
    priority: 10,
    enabled: true,
    field: "seoTitle",
    validate(value: string): SEOValidationResult {
      const len = value.length;
      if (len === 0) return { field: "seoTitle", value, rule: "title_length", passed: false, severity: "error", message: "SEO title is missing", recommendation: "Add a title between 30-60 characters." };
      if (len < SEO_TITLE_MIN) return { field: "seoTitle", value, rule: "title_length", passed: false, severity: "warning", message: `Title too short (${len}/${SEO_TITLE_MIN})`, recommendation: `Add ${SEO_TITLE_MIN - len} more characters.` };
      if (len > SEO_TITLE_MAX) return { field: "seoTitle", value, rule: "title_length", passed: false, severity: "warning", message: `Title too long (${len}/${SEO_TITLE_MAX})`, recommendation: `Trim ${len - SEO_TITLE_MAX} characters.` };
      return { field: "seoTitle", value, rule: "title_length", passed: true, severity: "info", message: `Title length is optimal (${len})`, recommendation: "" };
    },
  };
}

function descriptionRule(): ValidationRuleConfig {
  return {
    id: "description_length",
    label: "Meta Description Length",
    category: "content",
    priority: 20,
    enabled: true,
    field: "metaDescription",
    validate(value: string): SEOValidationResult {
      const len = value.length;
      if (len === 0) return { field: "metaDescription", value, rule: "description_length", passed: false, severity: "error", message: "Meta description is missing", recommendation: "Add a description between 50-160 characters." };
      if (len < SEO_DESCRIPTION_MIN) return { field: "metaDescription", value, rule: "description_length", passed: false, severity: "warning", message: `Description too short (${len}/${SEO_DESCRIPTION_MIN})`, recommendation: `Add ${SEO_DESCRIPTION_MIN - len} more characters.` };
      if (len > SEO_DESCRIPTION_MAX) return { field: "metaDescription", value, rule: "description_length", passed: false, severity: "warning", message: `Description too long (${len}/${SEO_DESCRIPTION_MAX})`, recommendation: `Trim ${len - SEO_DESCRIPTION_MAX} characters.` };
      return { field: "metaDescription", value, rule: "description_length", passed: true, severity: "info", message: `Description length is optimal (${len})`, recommendation: "" };
    },
  };
}

function slugRule(): ValidationRuleConfig {
  return {
    id: "slug_format",
    label: "Slug Format",
    category: "technical",
    priority: 30,
    enabled: true,
    field: "slug",
    validate(value: string): SEOValidationResult {
      if (!value) return { field: "slug", value, rule: "slug_format", passed: false, severity: "error", message: "Slug is missing", recommendation: "Add a URL-friendly slug." };
      if (value.length > SLUG_MAX) return { field: "slug", value, rule: "slug_format", passed: false, severity: "warning", message: `Slug too long (${value.length}/${SLUG_MAX})`, recommendation: `Trim to ${SLUG_MAX} characters.` };
      if (!/^[a-z0-9-]+$/.test(value)) return { field: "slug", value, rule: "slug_format", passed: false, severity: "warning", message: "Slug contains invalid characters", recommendation: "Use only lowercase letters, numbers, and hyphens." };
      return { field: "slug", value, rule: "slug_format", passed: true, severity: "info", message: "Slug format is valid", recommendation: "" };
    },
  };
}

function canonicalRule(): ValidationRuleConfig {
  return {
    id: "canonical_url",
    label: "Canonical URL",
    category: "technical",
    priority: 40,
    enabled: true,
    field: "canonicalUrl",
    validate(value: string): SEOValidationResult {
      if (!value) return { field: "canonicalUrl", value, rule: "canonical_url", passed: false, severity: "warning", message: "Canonical URL is missing", recommendation: "Set a canonical URL to prevent duplicate content issues." };
      try { new URL(value); return { field: "canonicalUrl", value, rule: "canonical_url", passed: true, severity: "info", message: "Canonical URL is valid", recommendation: "" }; }
      catch { return { field: "canonicalUrl", value, rule: "canonical_url", passed: false, severity: "error", message: "Canonical URL is invalid", recommendation: "Enter a valid URL including https://." }; }
    },
  };
}

function openGraphRule(): ValidationRuleConfig {
  return {
    id: "open_graph",
    label: "Open Graph",
    category: "social",
    priority: 50,
    enabled: true,
    field: "ogTitle",
    validate(value: string, context?: Record<string, unknown>): SEOValidationResult {
      const title = value;
      const description = (context?.ogDescription as string) ?? "";
      const image = (context?.ogImage as string) ?? "";
      if (!title) return { field: "ogTitle", value: title, rule: "open_graph", passed: false, severity: "warning", message: "OG title is missing", recommendation: "Add an Open Graph title for social sharing." };
      if (title.length > OG_TITLE_MAX) return { field: "ogTitle", value: title, rule: "open_graph", passed: false, severity: "warning", message: `OG title too long (${title.length}/${OG_TITLE_MAX})`, recommendation: `Trim to ${OG_TITLE_MAX} characters.` };
      if (!description) return { field: "ogDescription", value: description, rule: "open_graph", passed: false, severity: "warning", message: "OG description is missing", recommendation: "Add an Open Graph description." };
      if (description.length > OG_DESCRIPTION_MAX) return { field: "ogDescription", value: description, rule: "open_graph", passed: false, severity: "warning", message: `OG description too long (${description.length}/${OG_DESCRIPTION_MAX})`, recommendation: `Trim to ${OG_DESCRIPTION_MAX} characters.` };
      if (!image) return { field: "ogImage", value: image, rule: "open_graph", passed: false, severity: "warning", message: "OG image is missing", recommendation: "Add an Open Graph image (1200x630 recommended)." };
      return { field: "ogTitle", value: title, rule: "open_graph", passed: true, severity: "info", message: "Open Graph is complete", recommendation: "" };
    },
  };
}

function twitterRule(): ValidationRuleConfig {
  return {
    id: "twitter_card",
    label: "Twitter Card",
    category: "social",
    priority: 60,
    enabled: true,
    field: "twitterTitle",
    validate(value: string, context?: Record<string, unknown>): SEOValidationResult {
      const title = value;
      const description = (context?.twitterDescription as string) ?? "";
      const image = (context?.twitterImage as string) ?? "";
      if (!title) return { field: "twitterTitle", value: title, rule: "twitter_card", passed: false, severity: "warning", message: "Twitter title is missing", recommendation: "Add a Twitter card title." };
      if (title.length > TWITTER_TITLE_MAX) return { field: "twitterTitle", value: title, rule: "twitter_card", passed: false, severity: "warning", message: `Twitter title too long (${title.length}/${TWITTER_TITLE_MAX})`, recommendation: `Trim to ${TWITTER_TITLE_MAX} characters.` };
      if (!description) return { field: "twitterDescription", value: description, rule: "twitter_card", passed: false, severity: "warning", message: "Twitter description is missing", recommendation: "Add a Twitter card description." };
      if (!image) return { field: "twitterImage", value: image, rule: "twitter_card", passed: false, severity: "warning", message: "Twitter image is missing", recommendation: "Add a Twitter card image." };
      return { field: "twitterTitle", value: title, rule: "twitter_card", passed: true, severity: "info", message: "Twitter card is complete", recommendation: "" };
    },
  };
}

function robotsRule(): ValidationRuleConfig {
  return {
    id: "robots_directives",
    label: "Robots Directives",
    category: "technical",
    priority: 70,
    enabled: true,
    field: "robotsNoIndex",
    validate(value: string): SEOValidationResult {
      if (value === "true") return { field: "robotsNoIndex", value, rule: "robots_directives", passed: false, severity: "warning", message: "Page is set to noindex", recommendation: "Allow indexing unless this page should not appear in search results." };
      return { field: "robotsNoIndex", value, rule: "robots_directives", passed: true, severity: "info", message: "Page is indexable", recommendation: "" };
    },
  };
}

function createRuleRegistry(): ValidationRuleRegistry {
  const registry = new ValidationRuleRegistry();
  registry.registerRules([
    titleRule(),
    descriptionRule(),
    slugRule(),
    canonicalRule(),
    openGraphRule(),
    twitterRule(),
    robotsRule(),
  ]);
  return registry;
}

export const validationEngine = createRuleRegistry();
