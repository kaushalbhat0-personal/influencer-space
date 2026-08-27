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
import type { PublishedSnapshot, WebsiteAggregate, NavigationItem, HeroContent } from "@/types/snapshot";
import { builderPagesToLayoutSnapshot } from "@/lib/builder/layout";
import { themeResolver } from "@/lib/theme/resolver-new";
import type { ResolvedSnapshotTheme } from "@/lib/theme/resolver-new";
import { applyHeroPresentation } from "@/lib/hero/presentation-options";

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
   * RCCF-71.1: creator appearance config (borderRadius px string, layoutDensity
   * preset) persisted on Website.themeConfig. Threaded into the canonical
   * snapshot so Builder preview, the preview route and the published storefront
   * all resolve the SAME appearance values through LayoutEngine.
   */
  themeConfig?: Record<string, string>;
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
  const hasOverrides =
    Object.keys(input.themeColors).length > 0 ||
    Object.keys(input.themeFonts).length > 0 ||
    (input.themeConfig && Object.keys(input.themeConfig).length > 0) ||
    false;
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
          // RCCF-71.2: controlled heading weight resolves through the SAME
          // resolver authority as fonts/appearance (never a Builder-only value).
          headingWeight: input.themeConfig?.headingWeight as string | undefined,
        },
        // RCCF-71.1: appearance config resolves through the SAME authority as
        // the theme — never a Builder-only CSS value.
        borderRadius: input.themeConfig?.borderRadius as string | undefined,
        layoutDensity: input.themeConfig?.layoutDensity as "compact" | "comfortable" | "spacious" | undefined,
      } as Partial<ResolvedSnapshotTheme>,
    } : undefined,
  );

  // RCCF-71.3: HERO PRESENTATION (textAlign/contentWidth/overlay) persists in
  // Website.themeConfig and is merged onto snapshot.content.hero by the SAME
  // pure rule the Builder canvas uses — so publish == preview route == canvas.
  // Content fields are never touched; old themeConfig without hero keys leaves
  // the hero unchanged (renderer falls back to the current look).
  const themeConfig = input.themeConfig ?? {};
  const applyHero = (hero: HeroContent): HeroContent =>
    applyHeroPresentation(hero as unknown as Record<string, unknown>, themeConfig) as unknown as HeroContent;

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
    content: { ...input.aggregate, hero: applyHero(input.aggregate.hero) },
    ...(input.homepageAggregate
      ? { homepageContent: { ...input.homepageAggregate, hero: applyHero(input.homepageAggregate.hero) } as WebsiteAggregate }
      : {}),
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
        ...(resolvedTheme?.typography.headingWeight ? { headingWeight: resolvedTheme.typography.headingWeight } : {}),
      },
      ...(resolvedTheme?.borderRadius ? { borderRadius: resolvedTheme.borderRadius } : {}),
      ...(resolvedTheme?.layoutDensity ? { layoutDensity: resolvedTheme.layoutDensity } : {}),
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
    renderingHints: (() => {
      const hints: PublishedSnapshot["renderingHints"] = input.experience ? { experience: input.experience } : {};
      // RCCF-BUILDER-05B: per-section flow derived from ThemeExperience family defaults.
      // Legacy snapshots (no ThemeExperience) default to shared.
      const exp = input.experience as { defaultFlow?: string; sections?: Record<string, { flow?: string }> } | null | undefined;
      if (exp) {
        const flowHints: Record<string, string> = {};
        for (const page of input.builderPages) {
          for (const section of page.sections) {
            const variant = (() => {
              const m = ((section as unknown as Record<string, unknown>).moduleId as string | undefined) ?? ((section as unknown as { slots?: Array<{ moduleId: string }> }).slots?.[0]?.moduleId) ?? "";
              if (m.startsWith("hero.")) return "hero";
              if (m.startsWith("products.")) return "commerce";
              if (m.startsWith("gallery.")) return "gallery";
              if (m.startsWith("timeline.")) return "timeline";
              if (m.startsWith("testimonials.")) return "social";
              if (m.startsWith("faq.")) return "default";
              if (m.startsWith("links.")) return "social";
              if (m.startsWith("contact.") || m.startsWith("newsletter.")) return "cta";
              if (m.startsWith("footer.")) return "footer";
              if (m.startsWith("courses.")) return "commerce";
              if (m.startsWith("services.")) return "commerce";
              if (m.startsWith("games.")) return "commerce";
              return "default";
            })();
            const perVariant = exp.sections?.[variant] as { flow?: string } | undefined;
            const flow = perVariant?.flow ?? exp.defaultFlow ?? "shared";
            flowHints[section.id] = flow;
          }
        }
        if (Object.keys(flowHints).length > 0) hints.flow = flowHints as PublishedSnapshot["renderingHints"]["flow"];
      }
      return hints;
    })(),
  };
}
