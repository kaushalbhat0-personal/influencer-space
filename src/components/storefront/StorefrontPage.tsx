import { notFound } from "next/navigation";
import type { PublishedSnapshot } from "@/types/snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { DataBoundRenderer } from "@/lib/renderer/data-bound";
import { ComponentErrorBoundary } from "@/components/ui/ComponentErrorBoundary";
import { StorefrontNav } from "@/components/storefront/StorefrontNav";
import { TrustIndicators } from "@/components/storefront/TrustIndicators";
import { themeRegistry } from "@/lib/theme/registry-new";
import { experienceRegistry, ExperienceSection, resolveExperienceForCapabilities } from "@/modules/theme/runtime/experience";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { traceRuntime, type AggregateTraceDiagnostics } from "@/lib/observability/runtime-trace";
import { applyGoalSectionOrder, applyGoalNavigation, goalProfileService } from "@/modules/goals-runtime";
import { contentFromAggregate, resolveAdaptiveVisibility, baseOf } from "@/modules/experience-intelligence";
import { shouldRenderSection } from "@/modules/section-presentation";
import { isFlagEnabled } from "@/lib/platform/platform-config";
import { resolvePageBySlug, withViewAllHref, resolveNavHrefs } from "@/lib/storefront/page-resolver";
import { getPageHref } from "@/lib/storefront/storefront-root";

/**
 * RCCF-IMPLEMENTATION-09B (Phase 2) — shared storefront page renderer.
 *
 * Renders ONE page's sections (homepage OR an independent `[slug]` page)
 * through the exact same ExperienceSection + DataBoundRenderer path. Both
 * public routes mount this component; the homepage passes `pageSlug` as the
 * home page, `[domain]/[slug]` passes the requested slug. Section filtering
 * (visible/hidden/empty), goal composition and theme experience resolution all
 * happen here — one rendering rule for every public storefront page.
 */
export async function StorefrontPage({
  data,
  domain,
  isPreview,
  pageSlug,
}: {
  data: { tenantId: string; snapshot: unknown | null; diagnostics: AggregateTraceDiagnostics };
  domain: string;
  isPreview: boolean;
  /** Normalized slug ("products", "gallery", …) or null for the homepage. */
  pageSlug: string | null;
}) {
  if (!data.snapshot) notFound();

  // VALIDATION-04: honor the `maintenanceMode` platform flag.
  if (!isPreview && (await isFlagEnabled("maintenanceMode"))) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-neutral-50">Under maintenance</h1>
          <p className="text-sm leading-relaxed text-neutral-400">
            This site is temporarily unavailable while we perform scheduled maintenance. Please check back shortly.
          </p>
        </div>
      </main>
    );
  }

  const snap = data.snapshot as unknown as PublishedSnapshot;
  const resolveStart = performance.now();
  const doc = layoutEngine.resolve(snap);
  const resolveMs = performance.now() - resolveStart;
  const { theme, jsonLd } = doc;

  // RCCF-EPIC-05: goals compose with the storefront (navigation + section order).
  const goalProfile = await goalProfileService.getProfile(data.tenantId);
  const rawNavigation = applyGoalNavigation(doc.navigation, goalProfile);

  // RCCF-IMPLEMENTATION-09B (Phase 4): page-type nav items carry a page slug;
  // resolve them to real storefront routes so navigation links actually work.
  const navigation = resolveNavHrefs(rawNavigation, (pageSlug) => getPageHref(domain, pageSlug));

  // Resolve the target page from the document (full page type) — homepage →
  // the page marked isHome (fallback first page); slug route → the page whose
  // slug matches. Slugs are normalized so "/products" and "products" resolve
  // identically. Goal section order is then applied to this page's sections
  // (it only re-orders within a page, never pages themselves).
  const target = resolvePageBySlug(doc.pages, pageSlug);
  if (!target) notFound();

  const [orderedTarget] = applyGoalSectionOrder([target], goalProfile);
  const orderedSections = orderedTarget?.sections ?? target.sections;

  const runtimeSignature = traceRuntime({
    runtimeType: isPreview ? "preview" : process.env.NODE_ENV === "production" ? "production" : "storefront",
    creator: snap.content?.identity?.name ?? "",
    theme: snap.theme,
    layout: snap.layout,
    aggregate: snap.content,
    tenantId: data.tenantId,
    slug: domain,
    timings: { resolveMs, totalMs: resolveMs },
    diagnostics: data.diagnostics,
  });

  // RCCF-EPIC-08 Phase 3: adaptive visibility — conditional sections with empty
  // content are hidden when a goal profile is set.
  const hiddenBases = new Set(resolveAdaptiveVisibility(contentFromAggregate(snap.content), !!goalProfile));
  const filteredSections = orderedSections
    .filter((s) => s.visible !== false)
    .filter((s) => !hiddenBases.has(baseOf(s.moduleId) as never))
    // RCCF-LAUNCH-TRACK-04B (Phase 5/10): drop empty/auto-hidden sections so
    // they are removed from the DOM entirely.
    .filter((s) => shouldRenderSection(s.config as Record<string, unknown>));

  // RCCF-IMPLEMENTATION-09B (Phase 3): "View all → /{collection}" CTA. When a
  // section's base matches an independent non-home page in the document, the
  // renderer receives viewAllHref so it can link to the full collection
  // instead of the curated homepage slice.
  const sections = withViewAllHref(filteredSections, doc.pages, (pageSlug) => getPageHref(domain, pageSlug));

  // RCCF-LAUNCH-POLISH-06 (Phase 5/10): resolve the experience through the
  // Capability Runtime so unsupported premium layers fall back to the free tier.
  const themeDef = snap.theme?.packageId ? themeRegistry.getById(snap.theme.packageId) : undefined;
  const experience = resolveExperienceForCapabilities(
    experienceRegistry.resolve({
      id: snap.theme?.packageId ?? null,
      category: themeDef?.category ?? null,
      premium: themeDef?.premium ?? null,
    }),
    await resolveActivePlan(undefined, data.tenantId)
      .then((p) => p.code)
      .catch(() => null),
  );

  return (
    <>
      <SkipLink />
      <StorefrontNav sections={navigation} />
      {isPreview && (
        <div
          className="sticky top-0 z-50 bg-amber-900/80 backdrop-blur-sm text-center py-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-200"
          role="alert"
        >
          Preview Mode — changes are not public
        </div>
      )}
      <main id="main-content" className="min-h-screen bg-[var(--surface-root,#0A0A0B)] text-[var(--text-primary,#FAFAFA)] pb-20 md:pb-0" style={theme as React.CSSProperties} data-runtime-signature={runtimeSignature}>
        {jsonLd.map((ld: Record<string, unknown>, i: number) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        ))}
        {sections.map((section, i) => {
          const isFirst = i === 0;
          const isLast = i === sections.length - 1;
          const sectionVariant = isFirst ? "hero" as const : isLast ? "footer" as const : "default" as const;
          return (
            <ExperienceSection
              key={`${section.id}-${i}`}
              id={section.moduleId?.split(".")[0] ?? `section-${i}`}
              experience={experience}
              index={i}
              variant={sectionVariant}
              divider="bottom"
              data-testid={`experience-section-${i}`}
            >
              <ComponentErrorBoundary componentId={section.moduleId}>
                <DataBoundRenderer slot={{ moduleId: section.moduleId, config: section.config }} />
              </ComponentErrorBoundary>
            </ExperienceSection>
          );
        })}
        <TrustIndicators declaredFacts={snap.content?.declaredFacts} />
      </main>
    </>
  );
}

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-s8ul-cyan focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
    >
      Skip to main content
    </a>
  );
}
