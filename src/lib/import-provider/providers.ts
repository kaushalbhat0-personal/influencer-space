/**
 * Import Providers — IMPLEMENTATION-55 / 55.1
 *
 * Each provider gets dedicated title, subtitle, validation, and help text.
 * UI renders entirely from these metadata fields.
 */
import { registerImportProvider, type CreatorProfile } from "./registry";

// ── YouTube ───────────────────────────────────────────────────
registerImportProvider({
  id: "youtube",
  label: "YouTube",
  description: "Connect your channel to import videos, branding and audience data.",
  icon: "youtube",
  category: "import",
  title: "Import from YouTube",
  subtitle: "Paste your YouTube channel URL and we'll analyse your content, audience and brand to build your storefront.",
  inputType: "url",
  placeholder: "https://youtube.com/@yourchannel",
  helperText: "Works with channel URLs, video URLs, and @handle links.",
  estimatedTime: "30 seconds – 2 minutes",
  capabilities: ["branding", "products", "social_links", "media", "audience"],
  available: true,
  supportsLaterImport: true,
  matches(input: string) { return /youtube\.com|youtu\.be/i.test(input); },
  validateInput(input: string) {
    if (!/youtube\.com|youtu\.be/i.test(input)) return "Enter a valid YouTube URL (youtube.com or youtu.be).";
    return null;
  },
  async acquire(input: string): Promise<CreatorProfile> {
    try {
      const { ProfileAcquisitionEngine } = await import("@/lib/generation/acquisition/engine");
      const engine = new ProfileAcquisitionEngine();
      const result = await engine.acquire(input, "");
      const source = result.source as unknown as Record<string, unknown>;
      return {
        platform: "youtube", creatorName: (source.displayName as string) || input,
        bio: source.bio as string | undefined, avatarUrl: source.avatarUrl as string | undefined,
        followers: source.followers as number | undefined, website: source.website as string | undefined,
        socialLinks: (source.socialLinks as Array<{ platform: string; url: string }>) ?? [], rawSource: input,
        metadata: result.meta as Record<string, unknown> | undefined,
      };
    } catch {
      return { platform: "youtube", creatorName: input, rawSource: input };
    }
  },
});

// ── Website ───────────────────────────────────────────────────
registerImportProvider({
  id: "website",
  label: "Website",
  description: "Import your website's branding, SEO metadata and content.",
  icon: "globe",
  category: "import",
  title: "Import from Website",
  subtitle: "Paste your website URL to extract your title, description and branding.",
  inputType: "url",
  placeholder: "https://yourdomain.com",
  helperText: "We'll read your page's title, meta description, and Open Graph tags.",
  estimatedTime: "10 – 15 seconds",
  capabilities: ["branding", "description", "social_links"],
  available: true,
  supportsLaterImport: true,
  matches(input: string) { return /^https?:\/\//i.test(input) && !/(?:youtube|youtu\.be|google\.com\/maps|linkedin\.com|instagram\.com|tiktok\.com|twitch\.tv|x\.com|twitter\.com)/i.test(input); },
  validateInput(input: string) {
    try { new URL(input.startsWith("http") ? input : `https://${input}`); return null; }
    catch { return "Enter a valid URL starting with https://."; }
  },
  async acquire(input: string): Promise<CreatorProfile> {
    const url = input.startsWith("http") ? input : `https://${input}`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "CreatorStore/1.0" }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error("unreachable");
      const html = await res.text();
      const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "";
      const desc = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] || html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] || "";
      const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] || "";
      const ogImage = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] || "";
      const favicon = html.match(/<link[^>]+rel="(?:shortcut )?icon"[^>]+href="([^"]+)"/i)?.[1] || "";
      return {
        platform: "website", creatorName: ogTitle || title || new URL(url).hostname.replace(/^www\./, "").split(".")[0]!,
        bio: desc, avatarUrl: ogImage || (favicon.startsWith("http") ? favicon : `${new URL(url).origin}${favicon}`) || undefined,
        website: url, rawSource: input,
      };
    } catch {
      return { platform: "website", creatorName: new URL(url).hostname.replace(/^www\./, ""), bio: `Website at ${url}`, website: url, rawSource: input };
    }
  },
});

// ── Google Business ───────────────────────────────────────────
registerImportProvider({
  id: "google_business",
  label: "Google Business",
  description: "Import your Google Maps business listing details.",
  icon: "map",
  category: "import",
  title: "Import from Google Business",
  subtitle: "Paste your Google Maps or Business Profile URL.",
  inputType: "url",
  placeholder: "https://maps.google.com/...",
  helperText: "We'll extract your business name from the Maps listing.",
  estimatedTime: "15 – 30 seconds",
  capabilities: ["branding", "location", "reviews"],
  available: true,
  supportsLaterImport: true,
  matches(input: string) { return /google\.com\/maps|goo\.gl\/maps/i.test(input); },
  validateInput(input: string) {
    if (!/google\.com\/maps|goo\.gl\/maps/i.test(input)) return "Enter a valid Google Maps or Business Profile URL.";
    return null;
  },
  async acquire(input: string): Promise<CreatorProfile> {
    const name = decodeURIComponent(input).match(/place\/([^/]+)/)?.[1]?.replace(/\+/g, " ") || "My Business";
    return { platform: "google_business", creatorName: name, bio: `Google Business: ${name}`, rawSource: input, category: "business" };
  },
});

// ── Manual AI ─────────────────────────────────────────────────
registerImportProvider({
  id: "manual_ai",
  label: "✨ Build with AI",
  description: "Describe your work and we'll generate your storefront with AI.",
  icon: "sparkles",
  category: "ai",
  title: "✨ Build with AI",
  subtitle: "Describe your work and we'll generate your first CreatorStore.",
  inputType: "text",
  placeholder: "I'm a fitness coach helping busy professionals lose weight through online coaching and nutrition plans.",
  helperText: "Try: Fitness Coach · Photographer · Developer · Restaurant · Fashion Brand · Music Artist · Consultant · Agency",
  estimatedTime: "30 seconds – 2 minutes",
  capabilities: ["ai", "branding", "products"],
  available: true,
  supportsLaterImport: false,
  aiFormFields: [
    { key: "name", label: "Name", type: "text", placeholder: "Your full name or brand name", required: true },
    { key: "profession", label: "Profession", type: "text", placeholder: "e.g. Fitness Coach, Photographer, Developer", required: false },
    { key: "category", label: "Category (optional)", type: "text", placeholder: "e.g. Health & Fitness", required: false },
    { key: "location", label: "Location (optional)", type: "text", placeholder: "e.g. Bangalore", required: false },
  ],
  async acquire(input: string, options?: { name?: string }): Promise<CreatorProfile> {
    return { platform: "manual_ai", creatorName: options?.name || "Creator", bio: input, rawSource: input, category: "generated" };
  },
});

// ── Blank ─────────────────────────────────────────────────────
registerImportProvider({
  id: "blank",
  label: "🛠 Build Manually",
  description: "Start with a blank CreatorStore and customise everything yourself.",
  icon: "edit",
  category: "fresh",
  title: "🛠 Build Manually",
  subtitle: "Start with a blank CreatorStore and customise everything yourself. No AI, no imports — just you and the builder.",
  inputType: "none",
  placeholder: "",
  estimatedTime: "Instant",
  capabilities: ["manual"],
  available: true,
  supportsLaterImport: true,
  async acquire(): Promise<CreatorProfile> { return { platform: "blank", creatorName: "My Store", rawSource: "" }; },
});
