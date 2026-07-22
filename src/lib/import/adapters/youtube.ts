import type { CreatorImportAdapter, ImportAnalysisResult } from "@/lib/import/types";

let YouTubeScraperService: { fetchChannelMetadata: (url: string) => Promise<YouTubeChannelMeta | null> } | null = null;

async function getScraper() {
  if (!YouTubeScraperService) {
    const mod = await import("@/services/youtube-scraper.service");
    YouTubeScraperService = mod.YouTubeScraperService;
  }
  return YouTubeScraperService;
}

interface YouTubeChannelMeta {
  id: string; title: string; description: string;
  thumbnailUrl: string; customUrl: string; subscriberCount: number;
}

function extractHandle(input: string): string {
  let h = input.trim();
  h = h.replace(/^https?:\/\//, "");
  h = h.replace(/^www\./, "");
  h = h.replace(/^youtube\.com\//, "");
  h = h.replace(/^@?/, "");
  h = h.split("/")[0];
  h = h.split("?")[0];
  return h.replace(/^@/, "");
}

export class YouTubeAdapter implements CreatorImportAdapter {
  source = "youtube" as const;
  label = "YouTube Channel";
  description = "Import from a YouTube channel URL or handle";

  validate(input: string): { valid: boolean; error?: string } {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, error: "YouTube URL or handle is required." };
    return { valid: true };
  }

  async analyze(input: string): Promise<ImportAnalysisResult> {
    try {
      const scraper = await getScraper();
      const handle = extractHandle(input);
      const meta: YouTubeChannelMeta | null = await scraper.fetchChannelMetadata(`@${handle}`);
      if (!meta) throw new Error("Channel not found");

      const products = this.inferProducts(meta.title);
      const palette = this.inferPalette();
      const warnings: string[] = [];

      if (products.length === 0) warnings.push("No products could be inferred from channel data.");
      if (!meta.description) warnings.push("Channel has no description — bio will be empty.");
      if (meta.subscriberCount < 1000) warnings.push("Channel has fewer than 1,000 subscribers — consider manual review.");

      const confidence = products.length > 0 ? 80 : 50;
      const completeness = Math.min(30 + (meta.description ? 20 : 0) + (products.length * 10), 90);

      return {
        confidence,
        completeness,
        warnings,
        creatorProfile: {
          source: "youtube",
          creatorName: meta.title,
          brandName: meta.title,
          tagline: meta.customUrl || meta.title,
          bio: meta.description?.slice(0, 500) || "",
          heroTitle: `Welcome to ${meta.title}`,
          aboutText: meta.description?.slice(0, 1000) || "",
          tone: "professional",
          niche: "",
          audience: "",
          products,
          services: [],
          socialLinks: [{ platform: "youtube", url: `https://youtube.com/@${handle}` }],
          seoTitle: meta.title,
          seoDesc: meta.description?.slice(0, 160) || `${meta.title} — CreatorStore storefront`,
          palette,
          logoUrl: meta.thumbnailUrl,
          faq: [],
          testimonials: [],
          pages: ["home", "products", "about", "contact"],
          channelId: meta.id,
        },
      };
    } catch {
      const handle = extractHandle(input);
      return {
        confidence: 20,
        completeness: 5,
        warnings: [
          "Could not fetch YouTube channel data. API key may be missing or channel not found.",
          "A minimal tenant will be created. Edit all fields before provisioning.",
        ],
        creatorProfile: {
          source: "youtube",
          creatorName: handle,
          brandName: handle,
          tagline: "",
          bio: "",
          heroTitle: `Welcome to ${handle}`,
          aboutText: "",
          tone: "professional",
          niche: "",
          audience: "",
          products: [],
          services: [],
          socialLinks: [{ platform: "youtube", url: `https://youtube.com/@${handle}` }],
          seoTitle: handle,
          seoDesc: `${handle} — CreatorStore storefront`,
          palette: { primary: "#6366f1", secondary: "#a78bfa" },
          faq: [],
          testimonials: [],
          pages: ["home", "products", "about", "contact"],
          channelId: undefined,
        },
      };
    }
  }

  private inferProducts(title: string): { name: string; price: number; description: string }[] {
    const t = title.toLowerCase();
    const suggestions: { name: string; price: number; description: string }[] = [];

    if (t.includes("course") || t.includes("learn") || t.includes("tutorial") || t.includes("education")) {
      suggestions.push({ name: "Online Course", price: 2999, description: "Full access to all course materials." });
      suggestions.push({ name: "E-Book", price: 499, description: "Digital guide and reference material." });
    }
    if (t.includes("game") || t.includes("gaming") || t.includes("stream") || t.includes("play")) {
      suggestions.push({ name: "Exclusive Content Pack", price: 999, description: "Curated content bundle for fans." });
      suggestions.push({ name: "Merch Pack", price: 1499, description: "Official merchandise bundle." });
    }
    if (t.includes("fashion") || t.includes("style") || t.includes("beauty") || t.includes("makeup")) {
      suggestions.push({ name: "Style Guide", price: 799, description: "Curated style recommendations." });
    }
    if (t.includes("tech") || t.includes("code") || t.includes("dev") || t.includes("programming")) {
      suggestions.push({ name: "Code Template Pack", price: 1499, description: "Ready-to-use templates." });
      suggestions.push({ name: "Premium Tutorial", price: 2499, description: "In-depth video tutorial series." });
    }
    if (t.includes("food") || t.includes("cook") || t.includes("recipe") || t.includes("kitchen")) {
      suggestions.push({ name: "Recipe E-Book", price: 599, description: "Collection of signature recipes." });
    }
    if (t.includes("fit") || t.includes("gym") || t.includes("workout") || t.includes("health")) {
      suggestions.push({ name: "Workout Plan", price: 1999, description: "Personalized fitness program." });
      suggestions.push({ name: "Meal Plan", price: 999, description: "Nutrition guide and meal prep plan." });
    }
    if (t.includes("music") || t.includes("beat") || t.includes("song") || t.includes("producer")) {
      suggestions.push({ name: "Sample Pack", price: 999, description: "Curated sound samples." });
      suggestions.push({ name: "Beat License", price: 2499, description: "Exclusive rights to use the beat." });
    }
    if (t.includes("photo") || t.includes("film") || t.includes("cinema")) {
      suggestions.push({ name: "Preset Pack", price: 799, description: "Professional photo presets." });
      suggestions.push({ name: "Lightroom Tutorial", price: 1499, description: "Photo editing masterclass." });
    }

    if (suggestions.length === 0) {
      suggestions.push({ name: "Digital Product", price: 999, description: "Premium digital offering." });
      suggestions.push({ name: "Consultation", price: 2499, description: "One-on-one consultation session." });
    }

    return suggestions;
  }

  private inferPalette(): { primary: string; secondary: string } {
    return { primary: "#6366f1", secondary: "#a78bfa" };
  }
}

export const youtubeAdapter = new YouTubeAdapter();
