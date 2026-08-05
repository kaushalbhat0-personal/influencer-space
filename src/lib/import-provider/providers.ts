/**
 * Import Providers — IMPLEMENTATION-55
 *
 * Auto-registers all import providers. Every provider uses the same
 * CreatorProfile output format — the Intelligence Pipeline stays unchanged.
 */
import { registerImportProvider, type CreatorProfile } from "./registry";

// ── YouTube Provider ──────────────────────────────────────────
registerImportProvider({
  id: "youtube",
  label: "YouTube",
  description: "Import your channel — videos, subscribers, branding, and more.",
  icon: "youtube",
  inputType: "url",
  placeholder: "Paste your YouTube channel URL...",
  estimatedTime: "30s — 2 min",
  capabilities: ["branding", "products", "social_links", "media", "audience"],
  available: true,
  matches(input: string) {
    return /youtube\.com|youtu\.be/i.test(input);
  },
  async acquire(input: string): Promise<CreatorProfile> {
    // YouTube provider delegates to the existing ProfileAcquisitionEngine.
    // Fall back to basic extraction if the engine is unavailable.
    try {
      const { ProfileAcquisitionEngine } = await import("@/lib/generation/acquisition/engine");
      const engine = new ProfileAcquisitionEngine();
      const result = await engine.acquire(input, "");
      const source = result.source as unknown as Record<string, unknown>;
      return {
        platform: "youtube",
        creatorName: (source.displayName as string) || input,
        bio: source.bio as string | undefined,
        avatarUrl: source.avatarUrl as string | undefined,
        followers: source.followers as number | undefined,
        website: source.website as string | undefined,
        socialLinks: (source.socialLinks as Array<{ platform: string; url: string }>) ?? [],
        rawSource: input,
        metadata: result.meta as Record<string, unknown> | undefined,
      };
    } catch {
      return { platform: "youtube", creatorName: input, rawSource: input };
    }
  },
});

// ── Website Provider ──────────────────────────────────────────
registerImportProvider({
  id: "website",
  label: "Website",
  description: "Import from your website — title, description, Open Graph metadata.",
  icon: "globe",
  inputType: "url",
  placeholder: "Paste your website URL...",
  estimatedTime: "10–15 seconds",
  capabilities: ["branding", "description", "social_links"],
  available: true,
  matches(input: string) {
    return /^https?:\/\//i.test(input) && !/youtube\.com|youtu\.be|google\.com\/maps|linkedin\.com|instagram\.com|tiktok\.com|twitch\.tv|x\.com|twitter\.com/i.test(input);
  },
  async acquire(input: string): Promise<CreatorProfile> {
    const url = input.startsWith("http") ? input : `https://${input}`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "CreatorStore/1.0" }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "";
      const desc = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1]
        || html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] || "";
      const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] || "";
      const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] || "";
      const favicon = html.match(/<link[^>]+rel="(?:shortcut )?icon"[^>]+href="([^"]+)"/i)?.[1]
        || html.match(/<link[^>]+href="([^"]+)"[^>]+rel="(?:shortcut )?icon"/i)?.[1] || "";

      return {
        platform: "website",
        creatorName: ogTitle || title || new URL(url).hostname.replace(/^www\./, "").split(".")[0]!,
        bio: desc,
        avatarUrl: ogImage || (favicon.startsWith("http") ? favicon : `${new URL(url).origin}${favicon}`) || undefined,
        website: url,
        rawSource: input,
      };
    } catch {
      return {
        platform: "website",
        creatorName: new URL(url).hostname.replace(/^www\./, ""),
        bio: `Website at ${url}`,
        website: url,
        rawSource: input,
      };
    }
  },
});

// ── Manual AI Provider ────────────────────────────────────────
registerImportProvider({
  id: "manual_ai",
  label: "Describe Yourself",
  description: "Tell us about yourself and we'll build your storefront with AI.",
  icon: "sparkles",
  inputType: "text",
  placeholder: "E.g. I'm a fitness coach from Bangalore. I help professionals lose weight through online coaching and sell meal plans...",
  estimatedTime: "30s — 2 min",
  capabilities: ["ai", "branding", "products"],
  available: true,
  async acquire(input: string, options?: { name?: string }): Promise<CreatorProfile> {
    const name = options?.name || "Creator";
    return {
      platform: "manual_ai",
      creatorName: name,
      bio: input,
      rawSource: input,
      category: "generated",
    };
  },
});

// ── Google Business Provider ──────────────────────────────────
registerImportProvider({
  id: "google_business",
  label: "Google Business",
  description: "Import from your Google Maps business listing.",
  icon: "map",
  inputType: "url",
  placeholder: "Paste your Google Maps business URL...",
  estimatedTime: "15–30 seconds",
  capabilities: ["branding", "location", "reviews"],
  available: true,
  matches(input: string) {
    return /google\.com\/maps|goo\.gl\/maps/i.test(input);
  },
  async acquire(input: string): Promise<CreatorProfile> {
    const name = decodeURIComponent(input).match(/place\/([^/]+)/)?.[1]?.replace(/\+/g, " ") || "My Business";
    return {
      platform: "google_business",
      creatorName: name,
      bio: `Google Business listing: ${name}`,
      rawSource: input,
      category: "business",
    };
  },
});

// ── Blank Provider ────────────────────────────────────────────
registerImportProvider({
  id: "blank",
  label: "Start from Scratch",
  description: "Skip AI import and set up manually. Add profiles later.",
  icon: "edit",
  inputType: "none",
  placeholder: "",
  estimatedTime: "Instant",
  capabilities: ["manual"],
  available: true,
  async acquire(): Promise<CreatorProfile> {
    return {
      platform: "blank",
      creatorName: "My Store",
      rawSource: "",
    };
  },
});
