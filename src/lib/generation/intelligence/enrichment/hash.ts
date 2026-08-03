/**
 * Normalized profile hashing — IMPLEMENTATION-32.
 *
 * Cache keys derive from the normalized ContentSource (not raw webpages).
 * Stable across runs: deterministic canonical serialization + SHA-1.
 */
import { createHash } from "crypto";
import type { ContentSource } from "@/lib/generation/intelligence/types";

/** Canonical serialization of the enrichment-relevant source fields. */
export function canonicalSource(source: ContentSource): string {
  return JSON.stringify({
    platform: source.platform,
    username: source.username,
    displayName: source.displayName,
    bio: source.bio,
    avatarUrl: source.avatarUrl,
    followers: source.followers,
    following: source.following,
    posts: source.posts,
    engagement: source.engagement,
    content: source.content.map((c) => ({ text: c.text, hashtags: c.hashtags, likes: c.likes, comments: c.comments })),
    categories: source.categories,
    links: source.links,
    verified: source.verified ?? false,
    website: source.website ?? null,
    languages: source.languages ?? null,
    location: source.location ?? null,
    keywords: source.keywords ?? null,
    hashtags: source.hashtags ?? null,
    socialLinks: source.socialLinks ?? null,
  });
}

export function hashSource(source: ContentSource): string {
  return createHash("sha1").update(canonicalSource(source)).digest("hex").slice(0, 20);
}
