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
import { goalProfileService } from "@/modules/goals-runtime";
import { isFlagEnabled } from "@/lib/platform/platform-config";
import { resolvePageBySlug, withViewAllHref, resolveStorefrontNavigation } from "@/lib/storefront/page-resolver";
import { resolveRenderableSections } from "@/lib/storefront/section-pipeline";
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

  // RCCF-EPIC-05: the goal profile is used for adaptive section visibility only.
  // Section ORDER and NAVIGATION ORDER are NOT goal-composed — the storefront
  // renders the persisted order so Builder/Admin == published snapshot == live
  // DOM (RCCF-AUDIT-10 + RCCF-AUDIT-10B parity contracts).
  const goalProfile = await goalProfileService.getProfile(data.tenantId);

  // RCCF-IMPLEMENTATION-09B (Phase 4) + RCCF-AUDIT-10B: resolve page-type nav
  // items to real storefront routes and PRESERVE the persisted navigation order.
  // Goal-aware nav reordering (applyGoalNavigation) is never applied at live
  // render — the persisted/published order is canonical.
  const navigation = resolveStorefrontNavigation(doc.navigation, (pageSlug) => getPageHref(domain, pageSlug), goalProfile);

  // RCCF-AUDIT-10 (Section Order Parity): resolve the target page from the
  // document (full page type) — homepage → the page marked isHome (fallback
  // first page); slug route → the page whose slug matches. Slugs are normalized
  // so "/products" and "products" resolve identically. The page's sections are
  // rendered in their PERSISTED order — the same order the Builder shows and
  // the published snapshot stores. The goal profile may hide empty conditional
  // sections (adaptive visibility) but NEVER reorders them; render-time section
  // reordering is intentionally removed so Builder == snapshot == live DOM.
  const target = resolvePageBySlug(doc.pages, pageSlug);
  if (!target) notFound();

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

  // RCCF-EPIC-08 Phase 3 + RCCF-LAUNCH-TRACK-04B: adaptive visibility + section
  // presentation. Sections are filtered (hidden/empty), never reordered — the
  // relative order of the remaining sections is preserved exactly.
  const filteredSections = resolveRenderableSections(target.sections, {
    goalProfile,
    aggregate: snap.content,
  });

  // RCCF-IMPLEMENTATION-09B (Phase 3): "View all → /{collection}" CTA. When a
  // section's base matches an independent non-home page in the document, the
  // renderer receives viewAllHref so it can link to the full collection
  // instead of the curated homepage slice. RCCF-VALIDATION-09B: the CTA never
  // self-links — a section on its own full page (e.g. products on /products)
  // gets no view-all href.
  const sections = withViewAllHref(filteredSections, doc.pages, (pageSlug) => getPageHref(domain, pageSlug), target.slug);

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
      {/* RCCF-RESPONSIVE-02: `<main>` is the @container ancestor for container-query
          breakpoint variants (@sm/@lg) used by renderers — on live the container
          width equals the viewport, so @sm:/@lg: behave exactly like sm:/lg:. The
          Builder canvas uses the same mechanism with its device frame as container. */}
      <main id="main-content" className="@container min-h-screen bg-[var(--surface-root,#0A0A0B)] text-[var(--text-primary,#FAFAFA)] pb-20 md:pb-0" style={theme as React.CSSProperties} data-runtime-signature={runtimeSignature}>
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
