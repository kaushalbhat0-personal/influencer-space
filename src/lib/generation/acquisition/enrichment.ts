/**
 * Deterministic enrichment — IMPLEMENTATION-31.
 *
 * Pure, LLM-free utilities that enrich a ContentSource before KnowledgeBuilder
 * runs. Everything here is derived from the data actually present (bio, links,
 * URL) — nothing is invented. Missing inputs simply produce empty results.
 */
import type { ContentSource } from "@/lib/generation/intelligence/types";

const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

/** Collapse whitespace/zero-width chars, trim. Safe for keyword matching. */
export function normalizeText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Canonical handle without @, scheme, host, or path. */
export function normalizeHandle(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?[a-z0-9.-]+\//, "")
    .replace(/^[@/]+/, "")
    .replace(/\/.*$/, "")
    .split("?")[0]
    .trim();
}

export function extractLinks(text: string): string[] {
  const matches = normalizeText(text).match(URL_REGEX);
  return matches ? Array.from(new Set(matches)) : [];
}

export function extractWebsiteHostname(url: string): string | null {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export type LinkKind = "website" | "social" | "store" | "other";

/** Deterministic link classification by hostname. */
export function classifyLink(url: string): LinkKind {
  const host = extractWebsiteHostname(url) ?? "";
  const social = /youtube|youtu\.be|instagram|tiktok|twitter|x\.com|linkedin|twitch|facebook|discord|telegram|snapchat|pinterest|threads|tumblr|reddit|medium|substack|spotify|soundcloud|apple\.com|amazon\.com|music\.apple/i;
  const store = /shop|store|etsy|amazon\.in|flipkart|myntra|bigbasket|razer|merch/i;
  if (social.test(host)) return "social";
  if (store.test(host)) return "store";
  if (host.includes(".")) return "website";
  return "other";
}

export function extractHashtags(text: string): string[] {
  const tags = normalizeText(text).match(/#[a-zA-Z0-9_]+/g) ?? [];
  return Array.from(new Set(tags.map((t) => t.slice(1).toLowerCase()))).slice(0, 20);
}

/** Best-effort emoji extraction (ES5-safe surrogate pairs + common symbol ranges). */
export function extractEmojis(text: string): string[] {
  // Astral emoji = high + low surrogate pair; plus dingbats/misc + VS16.
  const re = /[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF\uFE0F]/g;
  return Array.from(new Set(text.match(re) ?? [])).slice(0, 10);
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "your", "our", "this", "that", "are", "was",
  "not", "all", "any", "but", "can", "from", "have", "has", "its", "more", "just",
  "about", "into", "than", "them", "then", "they", "will", "would", "also", "very",
]);

/** Tokenize → drop stopwords → dedupe → drop tiny tokens. Deterministic. */
export function extractKeywords(text: string, max = 24): string[] {
  const tokens = normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  return Array.from(new Set(tokens)).slice(0, max);
}

/**
 * Deterministic language heuristic (no API): Unicode script detection first,
 * then common stopword hits. Never guesses for short/ambiguous text.
 */
export function detectLanguage(text: string): string[] | null {
  const sample = normalizeText(text);
  if (!sample) return null;

  const scripts: Array<[string, RegExp]> = [
    ["cyrillic", /[\u0400-\u04FF]/],
    ["devanagari", /[\u0900-\u097F]/],
    ["arabic", /[\u0600-\u06FF]/],
    ["thai", /[\u0E00-\u0E7F]/],
    ["chinese", /[\u4E00-\u9FFF]/],
    ["japanese", /[\u3040-\u30FF]/],
    ["korean", /[\uAC00-\uD7AF]/],
  ];
  for (const [lang, re] of scripts) {
    if (re.test(sample)) return [lang];
  }

  // Latin-script language hits via compact stopword sets. Only multi-char words
  // with word-boundary matching are used (short tokens like "com"/"o" would
  // false-positive on substrings) — precision over recall, null rather than guess.
  const signals: Array<[string, string[]]> = [
    ["english", ["the", "and", "you", "with", "your", "for", "this", "that"]],
    ["spanish", ["que", "con", "para", "por", "los", "una"]],
    ["french", ["avec", "pour", "dans", "les", "une"]],
    ["portuguese", ["para", "que", "como", "uma"]],
    ["german", ["der", "die", "das", "und", "mit", "nicht"]],
  ];
  const lower = sample.toLowerCase();
  let best: string | null = null;
  let bestHits = 0;
  for (const [lang, words] of signals) {
    const hits = words.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(lower)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = lang;
    }
  }
  if (best && bestHits >= 2) return [best];
  return null;
}

export interface EnrichmentResult {
  source: ContentSource;
  signals: string[];
}

/**
 * Deterministically enrich an acquired ContentSource. Only derives what the
 * data actually supports (bio, links, URL) — never invents values.
 */
export function applyEnrichment(input: ContentSource): EnrichmentResult {
  const signals: string[] = [];
  const source: ContentSource = { ...input };

  // Safe text normalization (removes zero-width chars, collapses whitespace).
  if (source.bio) {
    const bio = normalizeText(source.bio);
    if (bio !== source.bio) {
      source.bio = bio;
      signals.push("bio:normalized");
    }
  }

  // Discover links from the bio and merge into the canonical link set.
  const bioLinks = extractLinks(source.bio);
  const dedupedBase = Array.from(new Set(source.links));
  const mergedLinks = Array.from(new Set([...source.links, ...bioLinks]));
  if (mergedLinks.length !== dedupedBase.length) {
    source.links = mergedLinks;
    signals.push(`links:normalized ${mergedLinks.length}`);
  }

  // Website hostname (primary) from the first "website" classified link.
  if (!source.website) {
    const websiteLink = source.links.find((l) => classifyLink(l) === "website");
    if (websiteLink) {
      const host = extractWebsiteHostname(websiteLink);
      if (host) {
        source.website = host;
        signals.push("website:detected");
      }
    }
  }

  // Social links classification.
  const socialLinks = source.links.filter((l) => classifyLink(l) === "social");
  if (socialLinks.length > 0) {
    source.socialLinks = Array.from(new Set(socialLinks));
    signals.push(`social_links:${socialLinks.length}`);
  }

  // Keyword / hashtag / language signals from the bio.
  if (source.bio) {
    const keywords = extractKeywords(source.bio);
    if (keywords.length > 0) {
      source.keywords = keywords;
      signals.push(`keywords:${keywords.length}`);
    }
    const hashtags = extractHashtags(source.bio);
    if (hashtags.length > 0) {
      source.hashtags = hashtags;
      signals.push(`hashtags:${hashtags.length}`);
    }
    const languages = detectLanguage(source.bio);
    if (languages && languages.length > 0) {
      source.languages = languages;
      signals.push(`language:${languages[0]}`);
    }
  }

  // Media summary (only counts media the adapter actually returned).
  if (source.avatarUrl || source.media?.count) {
    source.media = {
      count: (source.media?.count ?? 0) + (source.avatarUrl ? 1 : 0),
      types: Array.from(new Set([...(source.media?.types ?? []), ...(source.avatarUrl ? ["avatar"] : [])])),
    };
    signals.push("media:present");
  }

  return { source, signals };
}
