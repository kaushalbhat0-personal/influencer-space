import type { CreatorAcquisitionAdapter, AcquisitionResult } from "@/lib/acquisition/types";
import type { BusinessProfile } from "@/lib/acquisition/business-types";
import { inferCategory } from "@/lib/acquisition/classify";
import { Grid } from "lucide-react";

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

export class YouTubeAcquisitionAdapter implements CreatorAcquisitionAdapter {
  id = "youtube" as const;
  label = "YouTube Channel";
  description = "Import from a YouTube channel URL or handle";
  icon = Grid;
  requiresManualReview = false;
  typicalConfidence = 70;

  validate(input: string): { valid: boolean; error?: string } {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, error: "YouTube URL or handle is required." };

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(@[a-zA-Z0-9_-]{3,}|channel\/[a-zA-Z0-9_-]+|c\/[a-zA-Z0-9_-]+|user\/[a-zA-Z0-9_-]+)|youtu\.be\/[a-zA-Z0-9_-]+)/;
    if (!youtubeRegex.test(trimmed)) {
      return { valid: false, error: "Invalid YouTube URL. Expected format: https://youtube.com/@handle" };
    }

    const handle = extractHandle(trimmed);
    if (!handle) {
      return { valid: false, error: "Could not extract YouTube handle from the provided URL." };
    }

    return { valid: true };
  }

  async acquire(input: string): Promise<AcquisitionResult> {
    try {
      const scraper = await getScraper();
      const handle = extractHandle(input);
      const meta: YouTubeChannelMeta | null = await scraper.fetchChannelMetadata(`@${handle}`);
      if (!meta) throw new Error("Channel not found");

      const products = this.inferProducts(meta.title);
      const palette = this.inferPalette();
      const warnings: string[] = [];
      const { category, industry } = inferCategory(meta.title, meta.description);

      if (products.length === 0) warnings.push("No products could be inferred from channel data.");
      if (!meta.description) warnings.push("Channel has no description — bio will be empty.");
      if (meta.subscriberCount < 1000) warnings.push("Channel has fewer than 1,000 subscribers — consider manual review.");

      const confidence = products.length > 0 ? 80 : 50;
      const completeness = Math.min(30 + (meta.description ? 20 : 0) + (products.length * 10), 90);

      return {
        strategy: "youtube",
        rawInput: input,
        confidence,
        completeness,
        warnings,
        requiresManualReview: false,
        assets: { avatarUrl: meta.thumbnailUrl },
        providerMetadata: { channelId: meta.id, subscriberCount: meta.subscriberCount },
        profile: {
          businessName: meta.title,
          ownerName: meta.title,
          category,
          industry,
          tagline: meta.customUrl || meta.title,
          description: meta.description?.slice(0, 500) || "",
          audience: "",
          goals: "",
          tone: "professional",
          offers: products.map((p) => ({ id: p.name.replace(/\s+/g, "_").toLowerCase(), type: "digital_download", name: p.name, description: p.description, price: p.price, currency: "INR" })),
          socialLinks: [{ platform: "youtube", url: `https://youtube.com/@${handle}` }],
          logoUrl: meta.thumbnailUrl,
          palette,
          pages: ["home", "products", "about", "contact"],
        } as BusinessProfile,
      };
    } catch {
      const handle = extractHandle(input);
      return {
        strategy: "youtube",
        rawInput: input,
        confidence: 20,
        completeness: 5,
        warnings: [
          "Could not fetch YouTube channel data. API key may be missing or channel not found.",
          "A minimal tenant will be created. Edit all fields before provisioning.",
        ],
        requiresManualReview: true,
        profile: {
          businessName: handle,
          ownerName: handle,
          category: "", industry: "",
          tagline: "", description: "", audience: "", goals: "", tone: "professional",
          offers: [],
          socialLinks: [{ platform: "youtube", url: `https://youtube.com/@${handle}` }],
          palette: { primary: "#6366f1", secondary: "#a78bfa" },
          pages: ["home", "products", "about", "contact"],
        } as BusinessProfile,
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
