/**
 * Shared runtime snapshot builder — IMPLEMENTATION-14.
 *
 * The SINGLE assembly rule for a PublishedSnapshot. Used by:
 *   - Publish (Draft Layout → Published Layout)
 *   - Storefront preview (?preview=true → Draft Layout + Live Content)
 *   - Builder canvas preview (client mirrors this shape via LayoutEngine)
 *
 * One builder. One layout source. One aggregate. One theme resolution.
 */

import type { BuilderPage } from "@/lib/builder/types";
import type { PublishedSnapshot, WebsiteAggregate, NavigationItem } from "@/types/snapshot";
import { builderPagesToLayoutSnapshot } from "@/lib/builder/layout";
import { themeResolver } from "@/lib/theme/resolver-new";
import type { ResolvedSnapshotTheme } from "@/lib/theme/resolver-new";

export const FALLBACK_THEME_ID = "com.creatos.neon-dark";

export interface RuntimeSnapshotInput {
  websiteId: string;
  correlationId: string;
  builderPages: BuilderPage[];
  aggregate: WebsiteAggregate;
  navItems: NavigationItem[];
  themePackageId: string | null;
  themeColors: Record<string, string>;
  themeFonts: Record<string, string>;
  /**
   * RCCF-02: homepage-curated aggregate (featured-first, capped). Baked at
   * publish so the published homepage reads no live business tables.
   */
  homepageAggregate?: WebsiteAggregate;
  /** RCCF-02: baked storefront gates (optional, old snapshots default off). */
  goalProfilePresent?: boolean;
  maintenanceMode?: boolean;
  /** RCCF-02: capability-resolved ThemeExperience (optional). */
  experience?: unknown;
}

/** An empty aggregate — publish never bakes content into the snapshot. */
export const EMPTY_AGGREGATE: WebsiteAggregate = {
  identity: { name: "", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
  hero: { title: "", subtitle: "", description: "" },
  products: [],
  gallery: [],
  links: [],
  seo: { title: "", description: "" },
  testimonials: [],
  faq: [],
  timeline: [],
  games: [],
  contentFeed: [],
  courses: [],
  services: [],
};

export function buildRuntimeSnapshot(input: RuntimeSnapshotInput): PublishedSnapshot {
  const hasOverrides = Object.keys(input.themeColors).length > 0 || Object.keys(input.themeFonts).length > 0;
  const resolvedTheme = themeResolver.resolveForSnapshot(
    input.themePackageId ?? FALLBACK_THEME_ID,
    "dark",
    hasOverrides ? {
      overrides: {
        colors: {
          primary: input.themeColors.primary as string | undefined,
          secondary: input.themeColors.secondary as string | undefined,
          accent: input.themeColors.accent as string | undefined,
          background: input.themeColors.background as string | undefined,
          foreground: input.themeColors.foreground as string | undefined,
          muted: input.themeColors.muted as string | undefined,
        },
        typography: {
          heading: input.themeFonts.heading as string | undefined,
          body: input.themeFonts.body as string | undefined,
        },
      } as Partial<ResolvedSnapshotTheme>,
    } : undefined,
  );

  return {
    _schema: "creatorstore.snapshot",
    _version: 1,
    metadata: {
      version: 0,
      publishedAt: new Date().toISOString(),
      previousVersion: null,
      correlationId: input.correlationId,
      generatedBy: "dashboard",
      goalProfilePresent: input.goalProfilePresent ?? false,
      maintenanceMode: input.maintenanceMode ?? false,
    },
    content: input.aggregate,
    ...(input.homepageAggregate ? { homepageContent: input.homepageAggregate } : {}),
    layout: builderPagesToLayoutSnapshot(input.builderPages),
    theme: {
      packageId: resolvedTheme?.packageId ?? input.themePackageId ?? FALLBACK_THEME_ID,
      colors: {
        primary: resolvedTheme?.colors.primary ?? "#6366F1",
        secondary: resolvedTheme?.colors.secondary ?? "#818CF8",
        accent: resolvedTheme?.colors.accent ?? "#A5B4FC",
        background: resolvedTheme?.colors.background ?? "#09090b",
        foreground: resolvedTheme?.colors.foreground ?? "#fafafa",
        muted: resolvedTheme?.colors.muted ?? "#a1a1aa",
      },
      typography: {
        heading: resolvedTheme?.typography.heading ?? "Inter",
        body: resolvedTheme?.typography.body ?? "Inter",
      },
    },
    navigation: input.navItems.map((n) => ({
      id: n.id,
      label: n.label,
      href: n.href,
      type: n.type,
      order: n.order,
      visible: n.visible,
      ...(n.target ? { target: n.target } : {}),
      ...(n.icon ? { icon: n.icon } : {}),
    })),
    renderingHints: input.experience ? { experience: input.experience } : {},
  };
}
