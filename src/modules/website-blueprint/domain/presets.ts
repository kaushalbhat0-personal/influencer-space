import type { WebsiteBlueprint } from "./types";
import type { BusinessProfile } from "@/lib/acquisition/business-types";

export function createEmptyBlueprint(name: string): WebsiteBlueprint {
  return {
    metadata: { name, description: "", businessCategory: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sourceStrategy: "", sourceInput: "", generationReason: "" },
    branding: { businessName: name, ownerName: "", tagline: "", bio: "", primaryColor: "#6366f1", secondaryColor: "#a78bfa" },
    theme: { family: "clean", packageId: "neon-dark", mode: "dark", reason: "Default theme" },
    layout: { pageWidth: "default", contentSpacing: "comfortable", containerStyle: "boxed" },
    navigation: { items: [], style: "top", sticky: true, reason: "" },
    pages: [],
    globalSections: [],
    commerce: { enabled: false, currency: "INR", offers: [], checkoutType: "self" },
    seo: { globalTitle: name, globalDescription: "", schemaType: "WebSite", reason: "" },
    automation: { enabled: false, triggers: [] },
    analytics: { enabled: true, trackEvents: ["page_view", "purchase", "signup"] },
    version: { major: 1, minor: 0, patch: 0, status: "draft" },
  };
}

export function blueprintFromProfile(profile: BusinessProfile): WebsiteBlueprint {
  const name = profile.businessName || profile.ownerName || "Storefront";
  const bp = createEmptyBlueprint(name);

  bp.metadata.businessCategory = profile.category || "other";
  bp.metadata.description = profile.description || "";
  bp.metadata.generationReason = "Generated from manual business profile";

  bp.branding = {
    businessName: profile.businessName || profile.ownerName || "Storefront",
    ownerName: profile.ownerName || "",
    tagline: profile.tagline || "",
    bio: profile.description || "",
    logoUrl: profile.logoUrl,
    primaryColor: profile.palette.primary,
    secondaryColor: profile.palette.secondary,
  };

  bp.commerce.offers = profile.offers.map((o) => ({
    id: o.id,
    type: o.type,
    name: o.name,
    description: o.description,
    price: o.price,
    currency: o.currency || "INR",
  }));
  bp.commerce.enabled = profile.offers.length > 0;

  bp.seo.globalDescription = `${name} — ${profile.tagline || profile.description?.slice(0, 80) || "Storefront on CreatorStore"}`;

  if (profile.socialLinks.length > 0) {
    bp.analytics.trackEvents.push("social_click");
  }

  bp.version = { major: 1, minor: 0, patch: 0, status: "draft" };

  return bp;
}
