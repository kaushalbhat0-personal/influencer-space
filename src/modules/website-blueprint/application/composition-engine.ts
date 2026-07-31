import type { BusinessProfile } from "@/lib/acquisition/business-types";
import type { BusinessRecommendation } from "@/modules/business-intelligence/domain/types";
import type { WebsiteBlueprint, BlueprintPage, BlueprintSection, BlueprintNavItem, BlueprintBlock } from "../domain/types";
import { blueprintFromProfile } from "../domain/presets";
import { getSectionDefinition, SECTION_REGISTRY } from "../domain/section-registry";
import { getPageDefinition } from "../domain/page-registry";

export function composeBlueprint(
  profile: BusinessProfile,
  recommendations?: BusinessRecommendation | null,
): WebsiteBlueprint {
  const bp = blueprintFromProfile(profile);
  const category = profile.category || "other";
  const recs = recommendations;
  const slugSet = new Set(profile.pages || []);

  // Compose navigation from recommendations or defaults
  const navItems: BlueprintNavItem[] = [];
  const addNav = (label: string, href: string, order: number) => {
    navItems.push({ id: `nav_${order}`, label, href, order, visible: true });
  };

  addNav("Home", "/", 0);

  if (profile.offers.length > 0) {
    const offerSlug = slugSet.has("services") ? "/services" : slugSet.has("products") ? "/products" : "/products";
    addNav(profile.offers.length > 3 ? "Products" : "Services", offerSlug, 1);
  }

  if (slugSet.has("portfolio")) addNav("Portfolio", "/portfolio", 2);
  if (slugSet.has("gallery")) addNav("Gallery", "/gallery", navItems.length);
  if (slugSet.has("book") || category === "coach" || category === "consultant") addNav("Book a Session", "/book", navItems.length);
  if (slugSet.has("about")) addNav("About", "/about", navItems.length);
  if (slugSet.has("contact")) addNav("Contact", "/contact", navItems.length);

  bp.navigation = {
    items: navItems,
    style: "top",
    sticky: true,
    reason: `Navigation generated for ${category} business with ${navItems.length} items.`,
  };

  // Compose pages
  const pageDefs = recs?.pages?.length
    ? recs.pages.map((r) => ({ slug: r.slug.startsWith("/") ? r.slug.slice(1) : r.slug, name: r.name }))
    : [];

  const slugArray = Array.from(slugSet);
  const wantedSlugs = new Set(["/", ...pageDefs.map((p) => `/${p.slug}`), ...slugArray.map((s) => `/${s}`)]);

  for (const def of PAGE_REGISTRY) {
    if (!wantedSlugs.has(def.slug)) continue;

    const pages = def;
    const reason = recs?.pages?.find((r) => r.slug.startsWith(def.slug))?.reason || `Standard page for ${category} storefront.`;

    const sections: BlueprintSection[] = [];

    // Add sections specific to this page from recommendations or registry
    const pageSections = recs?.sections?.filter((s) => s.pageSlug === def.slug) || [];
    const registrySections = SECTION_REGISTRY.filter((s) => s.allowedPages.includes(def.slug));

    for (const sec of pageSections) {
      const sectionDef = getSectionDefinition(sec.moduleId);
      if (!sectionDef) continue;
      sections.push({
        id: `sec_${sections.length}`,
        type: sec.moduleId,
        label: sectionDef.label,
        priority: sec.order,
        order: sec.order,
        visibility: "visible",
        configuration: { ...sectionDef.defaultConfiguration },
        layoutHints: { width: "default", padding: "medium", background: "default" },
        blocks: [],
      });
    }

    if (sections.length === 0 && registrySections.length > 0) {
      // Add first matching section as fallback
      const first = registrySections[0];
      sections.push({
        id: `sec_0`,
        type: first.type,
        label: first.label,
        priority: 0,
        order: 0,
        visibility: "visible",
        configuration: { ...first.defaultConfiguration },
        layoutHints: { width: "default", padding: "medium", background: "default" },
        blocks: [],
      });
    }

    const page: BlueprintPage = {
      id: `page_${def.slug.replace(/\//g, "_")}`,
      slug: def.slug,
      title: def.title,
      purpose: def.purpose,
      layout: { width: "default", showTitle: false, showFooter: true },
      sections,
      visibility: "published",
      seo: {
        title: `${profile.businessName} — ${def.title}`,
        description: `${profile.businessName} ${def.purpose.toLowerCase()}`,
        noIndex: false,
      },
      reason,
    };

    bp.pages.push(page);
  }

  // Apply theme from recommendations
  if (recs?.theme) {
    bp.theme = {
      family: recs.theme.family,
      packageId: recs.theme.family === "vibrant" ? "neon-dark" :
                  recs.theme.family === "professional" ? "midnight-ocean" :
                  recs.theme.family === "minimal" ? "slate-minimal" :
                  recs.theme.family === "corporate" ? "royal-plum" :
                  recs.theme.family === "warm" ? "warm-ember" :
                  recs.theme.family === "energetic" ? "forest-canopy" : "neon-dark",
      mode: "dark",
      reason: recs.theme.reason,
    };
  }

  // Apply SEO from recommendations
  if (recs?.seo) {
    bp.seo = {
      globalTitle: recs.seo.title,
      globalDescription: recs.seo.description,
      schemaType: "WebSite",
      reason: recs.seo.reason,
    };
  }

  // Apply conversion widgets as global sections
  if (recs?.conversion) {
    for (const c of recs.conversion) {
      const sectionDef = getSectionDefinition(`cta.${c.widget}`) || getSectionDefinition("cta.banner");
      if (sectionDef) {
        bp.globalSections.push({
          id: `global_${c.widget}`,
          type: sectionDef.type,
          label: sectionDef.label,
          priority: c.priority,
          order: c.priority,
          visibility: "visible",
          configuration: { ...sectionDef.defaultConfiguration },
          layoutHints: { width: "default", padding: "medium", background: "accent" },
          blocks: [],
        });
      }
    }
  }

  bp.version = { major: 1, minor: 0, patch: 0, status: "draft" };

  return bp;
}

import { PAGE_REGISTRY } from "../domain/page-registry";
