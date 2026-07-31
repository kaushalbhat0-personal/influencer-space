import type { BusinessProfile } from "@/lib/acquisition/business-types";
import type { BusinessRecommendation, BusinessTemplate } from "../domain/types";
import { getTemplate } from "../domain/templates";
import { calculateHealth } from "./health-engine";

function fillTemplate(template: string, business: BusinessProfile): string {
  return template
    .replace(/{businessName}/g, business.businessName || "Storefront")
    .replace(/{tagline}/g, business.tagline || "Storefront on CreatorStore")
    .replace(/{description}/g, business.description?.slice(0, 100) || "");
}

function getThemeFamily(category: string): { family: string; reason: string } {
  const families: Record<string, { family: string; reason: string }> = {
    creator: { family: "vibrant", reason: "Creators typically use vibrant, energetic themes to match their personality and stand out." },
    coach: { family: "professional", reason: "92% of coaching businesses use professional, clean layouts to establish trust with clients." },
    consultant: { family: "professional", reason: "Consultants build credibility with professional, understated themes." },
    freelancer: { family: "minimal", reason: "Freelancers benefit from minimal themes that let portfolio work speak for itself." },
    agency: { family: "corporate", reason: "Agencies convert better with corporate themes that showcase portfolio work." },
    restaurant: { family: "warm", reason: "Restaurants perform best with warm, appetizing color schemes and rich imagery." },
    fitness: { family: "energetic", reason: "Fitness businesses convert better with energetic themes and bold, motivating colors." },
    teacher: { family: "clean", reason: "Educational content works best with clean, readable layouts." },
    photographer: { family: "minimal", reason: "Photographers need minimal themes that put visuals front and center." },
    developer: { family: "dark", reason: "Developer portfolios commonly use dark-themed, code-inspired layouts." },
    designer: { family: "creative", reason: "Designers showcase their aesthetic sensibility through creative, bold themes." },
    musician: { family: "dark", reason: "Music artists commonly use dark, immersive themes that create atmosphere." },
    artist: { family: "creative", reason: "Visual artists need creative, gallery-style layouts that highlight their work." },
    author: { family: "clean", reason: "Authors benefit from clean, typography-focused themes that emphasize writing." },
    startup: { family: "modern", reason: "Startups use modern, bold themes that convey innovation and speed." },
  };
  return families[category] || { family: "clean", reason: "A clean, versatile theme works well for most business types." };
}

function getRecommendedOffers(template: BusinessTemplate, existingOffers: BusinessProfile["offers"]): OfferRecommendation[] {
  const existingTypes = new Set(existingOffers.map((o) => o.type));
  return template.offers
    .filter((o) => !existingTypes.has(o.type))
    .map((o) => ({ ...o, reason: `Businesses in the "${template.name}" category typically offer ${o.type.replace(/_/g, " ")} services.` }));
}

export function generateRecommendations(business: BusinessProfile): BusinessRecommendation {
  const category = business.category || "other";
  const template = getTemplate(category);
  const health = calculateHealth(business);

  const themeFamily = getThemeFamily(category);

  const pages = template.pages
    .filter((p) => {
      const slug = p.slug.replace("/", "");
      return !business.pages?.includes(slug);
    })
    .map((p) => ({ ...p, reason: `${template.name} storefronts typically include a "${p.name}" page.` }));

  const sections = template.sections.map((s) => ({ ...s, reason: `Recommended homepage section for ${template.name} businesses.` }));

  const navItems = template.navigation.filter((n) => {
    const href = n.href === "/" ? "/" : n.href.replace("/", "");
    return !business.pages?.includes(href);
  });

  const offers = getRecommendedOffers(template, business.offers);

  const seoTitle = fillTemplate(template.seo.titleTemplate, business);
  const seoDesc = fillTemplate(template.seo.descriptionTemplate, business);

  return {
    theme: { family: themeFamily.family, reason: themeFamily.reason, confidence: 85 },
    pages,
    sections,
    navigation: { items: navItems, reason: `Standard navigation structure for ${template.name} businesses.` },
    offers,
    seo: { title: seoTitle, description: seoDesc, reason: `SEO recommendation based on ${template.name} industry best practices.` },
    conversion: template.conversion.map((c) => ({ ...c, reason: `Conversion widgets that work well for ${template.name} storefronts.` })),
    health,
  };
}

import type { OfferRecommendation } from "../domain/types";
