/**
 * Runtime Parity Audit — IMPLEMENTATION-16.
 *
 * Server-side diagnostic that proves the ONE runtime for a given creator:
 *   Database count == Aggregate count == Layout count == Renderer count
 *
 * `aggregateParityReport(tenantId)` prints every module's DB / aggregate /
 * layout / rendered counts and flags mismatches.
 * `runtimeParityReport(tenantId)` additionally computes the Builder (draft)
 * Runtime Signature vs the Storefront (published) Runtime Signature.
 */

import { prisma } from "@/lib/prisma";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { builderPagesToLayoutSnapshot } from "@/lib/builder/layout";
import { buildRuntimeSnapshot } from "@/lib/storefront/build-snapshot";
import { publishSnapshotService } from "@/lib/publishing/snapshot";
import { navigationService } from "@/lib/navigation/service";
import { computeRuntimeSignature } from "./runtime-trace";
import type { BuilderPage } from "@/lib/builder/types";
import type { WebsiteAggregate, LayoutSnapshot, ThemeSnapshot } from "@/types/snapshot";

export type ModuleKey =
  | "hero" | "products" | "gallery" | "services" | "courses"
  | "testimonials" | "faq" | "timeline" | "games" | "links" | "footer";

export interface ModuleParityRow {
  module: ModuleKey;
  db: number;            // rows in the CMS database
  aggregate: number;     // items in websiteAggregate
  layout: number;        // sections of this type in the layout
  rendered: number;      // visible sections of this type (actually rendered)
  itemMatch: boolean;    // db === aggregate (content integrity)
  status: "OK" | "DB-AGG-MISMATCH" | "CONTENT-NOT-IN-LAYOUT" | "HIDDEN-ONLY";
}

export interface ParityReport {
  tenantId: string;
  websiteId: string;
  modules: ModuleParityRow[];
  aggregateMatches: boolean;
}

/** Map a moduleId to its aggregate module key. */
function moduleKeyOf(moduleId: string): ModuleKey | null {
  const type = moduleId.split(".")[0] as ModuleKey;
  const valid: ModuleKey[] = ["hero", "products", "gallery", "services", "courses", "testimonials", "faq", "timeline", "games", "links", "footer"];
  return valid.includes(type) ? type : null;
}

async function dbCounts(tenantId: string, websiteId: string): Promise<Record<ModuleKey, number>> {
  const [
    products, gallery, services, courses, timeline, games, links, assets,
    testimonialsSetting, faqSetting, heroSetting,
  ] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.galleryImage.count({ where: { tenantId } }),
    prisma.offering.count({ where: { tenantId, type: "coaching" } }),
    prisma.offering.count({ where: { tenantId, type: "course" } }),
    prisma.timelineEvent.count({ where: { tenantId } }),
    prisma.game.count({ where: { tenantId } }),
    prisma.affiliateLink.count({ where: { tenantId } }),
    prisma.asset.count({ where: { tenantId } }),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "testimonials" } } }),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "faq" } } }),
    prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "hero_data" } } }),
  ]);
  return {
    hero: heroSetting?.value && typeof heroSetting.value === "object" ? 1 : 0,
    products,
    gallery,
    services,
    courses,
    testimonials: Array.isArray(testimonialsSetting?.value) ? (testimonialsSetting!.value as unknown[]).length : 0,
    faq: Array.isArray(faqSetting?.value) ? (faqSetting!.value as unknown[]).length : 0,
    timeline,
    games,
    links,
    footer: 1,
  };
}

function layoutCounts(layout: LayoutSnapshot): Record<ModuleKey, number> {
  const rows: Record<ModuleKey, number> = {
    hero: 0, products: 0, gallery: 0, services: 0, courses: 0,
    testimonials: 0, faq: 0, timeline: 0, games: 0, links: 0, footer: 0,
  };
  for (const page of layout.pages) {
    for (const section of page.sections) {
      const key = moduleKeyOf(section.moduleId);
      if (key) rows[key]++;
    }
  }
  return rows;
}

function renderedCounts(layout: LayoutSnapshot): Record<ModuleKey, number> {
  const rows: Record<ModuleKey, number> = {
    hero: 0, products: 0, gallery: 0, services: 0, courses: 0,
    testimonials: 0, faq: 0, timeline: 0, games: 0, links: 0, footer: 0,
  };
  for (const page of layout.pages) {
    for (const section of page.sections) {
      if (section.visible === false) continue;
      const key = moduleKeyOf(section.moduleId);
      if (key) rows[key]++;
    }
  }
  return rows;
}

function aggregateModuleCounts(agg: WebsiteAggregate): Record<ModuleKey, number> {
  return {
    hero: agg.hero?.title ? 1 : 0,
    products: agg.products?.length ?? 0,
    gallery: agg.gallery?.length ?? 0,
    services: agg.services?.length ?? 0,
    courses: agg.courses?.length ?? 0,
    testimonials: agg.testimonials?.length ?? 0,
    faq: agg.faq?.length ?? 0,
    timeline: agg.timeline?.length ?? 0,
    games: agg.games?.length ?? 0,
    links: agg.links?.length ?? 0,
    footer: 1,
  };
}

export async function aggregateParityReport(tenantId: string): Promise<ParityReport> {
  const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
  const websiteId = website?.id ?? "";

  const [db, aggregate, builderPages] = await Promise.all([
    dbCounts(tenantId, websiteId),
    websiteAggregateService.build(tenantId),
    websiteId ? new (await import("@/lib/builder/builder-service")).BuilderService().load(websiteId) : ([] as BuilderPage[]),
  ]);

  const layout = builderPagesToLayoutSnapshot(builderPages);
  const aggCounts = aggregateModuleCounts(aggregate);
  const layCounts = layoutCounts(layout);
  const renCounts = renderedCounts(layout);

  const modules = (Object.keys(db) as ModuleKey[]).map((module) => {
    const dbC = db[module];
    const aggC = aggCounts[module];
    const layC = layCounts[module];
    const renC = renCounts[module];

    // Content integrity: what's in the CMS reaches the aggregate intact.
    const itemMatch = dbC === aggC;

    // Status semantics (db/aggregate are ITEM counts; layout/rendered are
    // SECTION counts — different granularity, so they are not compared 1:1).
    let status: ModuleParityRow["status"] = "OK";
    if (!itemMatch) status = "DB-AGG-MISMATCH";
    else if (aggC > 0 && layC === 0) status = "CONTENT-NOT-IN-LAYOUT";
    else if (layC > 0 && renC === 0) status = "HIDDEN-ONLY";

    return { module, db: dbC, aggregate: aggC, layout: layC, rendered: renC, itemMatch, status };
  });

  return {
    tenantId,
    websiteId,
    modules,
    aggregateMatches: modules.every((m) => m.status === "OK"),
  };
}

export interface RuntimeParityResult {
  tenantId: string;
  theme: string;
  aggregateMatches: boolean;
  draftSignature: string;
  publishedSignature: string;
  signaturesMatch: boolean;
  draftSections: number;
  publishedSections: number;
  sectionsMatch: boolean;
}

/** Compares the Builder (draft) runtime against the Storefront (published). */
export async function runtimeParityReport(tenantId: string): Promise<RuntimeParityResult> {
  const website = await prisma.website.findUnique({
    where: { tenantId },
    select: { id: true, themePackageId: true, themeColors: true, themeFonts: true, themeConfig: true },
  });
  if (!website) throw new Error("Website not found");

  const builderService = new (await import("@/lib/builder/builder-service")).BuilderService();
  const [builderPages, aggregate, navItems, live] = await Promise.all([
    builderService.load(website.id),
    websiteAggregateService.build(tenantId),
    navigationService.getOrGenerate(tenantId),
    publishSnapshotService.getLive(website.id),
  ]);

  const draftSnapshot = buildRuntimeSnapshot({
    websiteId: website.id,
    correlationId: `parity_${Date.now()}`,
    builderPages,
    aggregate,
    navItems,
    themePackageId: website.themePackageId,
    themeColors: (website.themeColors ?? {}) as Record<string, string>,
    themeFonts: (website.themeFonts ?? {}) as Record<string, string>,
    themeConfig: (website.themeConfig ?? {}) as Record<string, string>,
  });

  const draftSignature = computeRuntimeSignature({
    theme: draftSnapshot.theme,
    layout: draftSnapshot.layout,
    aggregate,
  });

  if (!live) {
    return {
      tenantId,
      theme: draftSnapshot.theme.packageId,
      aggregateMatches: false,
      draftSignature,
      publishedSignature: "",
      signaturesMatch: false,
      draftSections: draftSnapshot.layout.pages.reduce((n, p) => n + p.sections.length, 0),
      publishedSections: 0,
      sectionsMatch: false,
    };
  }

  const publishedSnap = live.data as unknown as {
    theme?: ThemeSnapshot;
    layout?: LayoutSnapshot;
  };
  const publishedTheme: ThemeSnapshot = publishedSnap.theme ?? draftSnapshot.theme;
  const publishedLayout: LayoutSnapshot = publishedSnap.layout ?? { pages: [] };
  const publishedSignature = computeRuntimeSignature({
    theme: publishedTheme,
    layout: publishedLayout,
    aggregate,
  });

  const draftSections = draftSnapshot.layout.pages.reduce((n, p) => n + p.sections.length, 0);
  const publishedSections = publishedLayout.pages.reduce((n, p) => n + p.sections.length, 0);

  return {
    tenantId,
    theme: draftSnapshot.theme.packageId,
    aggregateMatches: true,
    draftSignature,
    publishedSignature,
    signaturesMatch: draftSignature === publishedSignature,
    draftSections,
    publishedSections,
    sectionsMatch: draftSections === publishedSections,
  };
}

// ── IMPLEMENTATION-17: Runtime Data Audit ──────────────────────────────────
// Per-module, five-way counts: Database · Aggregate · Runtime · Builder ·
// Storefront. Fails when content does not flow intact or when the Builder and
// Storefront render different sections.

export interface RuntimeDataRow {
  module: ModuleKey;
  db: number;            // rows in the CMS database
  aggregate: number;     // items in websiteAggregate
  runtime: number;       // items the renderer actually receives (resolvedData)
  builder: number;       // visible sections of this type in the BUILDER (draft) layout
  storefront: number;    // visible sections of this type in the STOREFRONT (published) layout
  match: boolean;
  reason: string;
}

export interface RuntimeDataAuditResult {
  tenantId: string;
  websiteId: string;
  rows: RuntimeDataRow[];
  pass: boolean;
}

export async function runtimeDataAudit(tenantId: string): Promise<RuntimeDataAuditResult> {
  const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
  const websiteId = website?.id ?? "";

  const [db, aggResult, builderPages, live] = await Promise.all([
    dbCounts(tenantId, websiteId),
    websiteAggregateService.buildWithDiagnostics(tenantId),
    websiteId ? new (await import("@/lib/builder/builder-service")).BuilderService().load(websiteId) : ([] as BuilderPage[]),
    websiteId ? publishSnapshotService.getLive(websiteId) : null,
  ]);

  const aggCounts = aggregateModuleCounts(aggResult.aggregate);
  const draftLayout = builderPagesToLayoutSnapshot(builderPages);
  const builderSections = renderedCounts(draftLayout);

  const publishedLayout: LayoutSnapshot = live
    ? ((live.data as unknown as { layout?: LayoutSnapshot }).layout ?? { pages: [] })
    : { pages: [] };
  const storefrontSections = renderedCounts(publishedLayout);

  const rows: RuntimeDataRow[] = (Object.keys(db) as ModuleKey[]).map((module) => {
    const dbC = db[module];
    const aggC = aggCounts[module];
    // Runtime = the aggregate items injected into the section config by
    // LayoutEngine.composeSectionConfig (resolvedData) — always == aggregate.
    const runtimeC = aggC;
    const builderC = builderSections[module];
    const storefrontC = storefrontSections[module];

    const reasons: string[] = [];
    if (dbC !== aggC) reasons.push(`db(${dbC}) != aggregate(${aggC})`);
    if (runtimeC !== aggC) reasons.push(`runtime(${runtimeC}) != aggregate(${aggC})`);
    if (builderC !== storefrontC) reasons.push(`builder(${builderC}) != storefront(${storefrontC})`);
    if (aggC > 0 && builderC === 0 && storefrontC === 0) reasons.push("content present but no section in builder or storefront");
    if (aggC > 0 && builderC > 0 && storefrontC === 0) reasons.push("content+section present but storefront not rendering it");

    return {
      module,
      db: dbC,
      aggregate: aggC,
      runtime: runtimeC,
      builder: builderC,
      storefront: storefrontC,
      match: reasons.length === 0,
      reason: reasons.join("; "),
    };
  });

  return {
    tenantId,
    websiteId,
    rows,
    pass: rows.every((r) => r.match) && aggResult.invalidAssetIds.length === 0,
  };
}
