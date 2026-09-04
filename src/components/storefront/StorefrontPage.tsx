import { notFound } from "next/navigation";
import type { PublishedSnapshot } from "@/types/snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { DataBoundRenderer } from "@/lib/renderer/data-bound";
import { ComponentErrorBoundary } from "@/components/ui/ComponentErrorBoundary";
import { StorefrontNav } from "@/components/storefront/StorefrontNav";
import { StorefrontBreadcrumbs } from "@/components/storefront/StorefrontBreadcrumbs";
import { StorefrontCommand } from "@/components/storefront/StorefrontCommand";
import { TrustIndicators } from "@/components/storefront/TrustIndicators";
import { themeRegistry } from "@/lib/theme/registry-new";
import { experienceRegistry, ExperienceSection, PageExperience, resolveExperienceForCapabilities } from "@/modules/theme/runtime/experience";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { traceRuntime, type AggregateTraceDiagnostics } from "@/lib/observability/runtime-trace";
import { isFlagEnabled } from "@/lib/platform/platform-config";
import { resolvePageBySlug, withViewAllHref, resolveStorefrontNavigation } from "@/lib/storefront/page-resolver";
import { resolveRenderableSections } from "@/lib/storefront/section-pipeline";
import { getPageHref } from "@/lib/storefront/storefront-root";
import { serializeJsonLd } from "@/lib/storefront/json-ld";
import type { GoalProfile } from "@/modules/goals-runtime";
import type { ThemeExperience } from "@/modules/theme/runtime/experience";
import { footerService } from "@/lib/footer/service";

/**
 * RCCF-02: the published storefront reads gates ONLY from the baked snapshot.
 * The section pipeline only checks `!!goalProfile` (adaptive visibility), so a
 * minimal truthy profile is enough when the snapshot says a profile exists.
 * `null` = no goal profile → adaptive visibility off.
 */
const GOAL_PROFILE_PRESENT: GoalProfile = { weights: [], updatedAt: "", source: "manual", entityType: "" };

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

  const snap = data.snapshot as unknown as PublishedSnapshot;

  // RCCF-02: the published storefront reads the maintenance gate from the baked
  // snapshot (set at publish). Preview reads the live platform flag (draft).
  const maintenanceMode = isPreview
    ? await isFlagEnabled("maintenanceMode")
    : (snap.metadata?.maintenanceMode ?? false);
  if (!isPreview && maintenanceMode) {
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

  // RCCF-02: the published homepage renders the curated aggregate baked into the
  // snapshot (homepageContent); collection pages render the full aggregate
  // (content). Preview builds draft layout + live content, so it uses `content`.
  const renderAggregate = isPreview
    ? snap.content
    : pageSlug === null
      ? (snap.homepageContent ?? snap.content)
      : snap.content;

  const resolveStart = performance.now();
  const doc = layoutEngine.resolve({ ...snap, content: renderAggregate });
  const resolveMs = performance.now() - resolveStart;
  const { theme, jsonLd } = doc;

  // RCCF-02: the published storefront derives goal-profile PRESENCE from the
  // baked snapshot flag — no live goal-profile Setting read. The section
  // pipeline only uses `!!goalProfile` for adaptive visibility. Preview (draft)
  // reads the live goal profile as before.
  const goalProfile: GoalProfile | null = isPreview
    ? await (await import("@/modules/goals-runtime")).goalProfileService.getProfile(data.tenantId)
    : (snap.metadata?.goalProfilePresent ?? false)
      ? GOAL_PROFILE_PRESENT
      : null;

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
  // relative order of the remaining sections is preserved exactly. Uses the same
  // aggregate that LayoutEngine resolved (curated homepage on the homepage) so
  // adaptive visibility and rendering agree.
  const filteredSections = resolveRenderableSections(target.sections, {
    goalProfile,
    aggregate: renderAggregate,
  });

  // RCCF-IMPLEMENTATION-09B (Phase 3): "View all → /{collection}" CTA. When a
  // section's base matches an independent non-home page in the document, the
  // renderer receives viewAllHref so it can link to the full collection
  // instead of the curated homepage slice. RCCF-VALIDATION-09B: the CTA never
  // self-links — a section on its own full page (e.g. products on /products)
  // gets no view-all href.
  const sections = withViewAllHref(filteredSections, doc.pages, (pageSlug) => getPageHref(domain, pageSlug), target.slug);

  // RCCF-02 + RCCF-71.2: the capability-resolved experience baked into the
  // snapshot is preferred in BOTH published and preview paths (publish and the
  // preview loader bake the override-applied, capability-resolved experience),
  // so the storefront applies NO plan/billing reads at render time. Old
  // snapshots without a baked experience fall back to resolving against the
  // live plan (preview) / free tier (published) — always the safe minimal look.
  const themeDef = snap.theme?.packageId ? themeRegistry.getById(snap.theme.packageId) : undefined;
  const baseExperience = experienceRegistry.resolve({
    id: snap.theme?.packageId ?? null,
    category: themeDef?.category ?? null,
    premium: themeDef?.premium ?? null,
  });
  const bakedExperience = snap.renderingHints?.experience as ThemeExperience | undefined;
  const experience = bakedExperience
    ?? resolveExperienceForCapabilities(
        baseExperience,
        isPreview
          ? await resolveActivePlan(undefined, data.tenantId)
              .then((p) => p.code)
              .catch(() => null)
          : null,
      );

  // Commerce items for command palette (products/courses/services)
  const commerceItems = [
    ...((renderAggregate as unknown as { products?: Array<{ id: string; name: string }> }).products ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      type: "product" as const,
    })),
    ...((renderAggregate as unknown as { courses?: Array<{ id: string; title: string }> }).courses ?? []).map((c) => ({
      id: c.id,
      name: c.title,
      type: "course" as const,
    })),
    ...((renderAggregate as unknown as { services?: Array<{ id: string; title: string }> }).services ?? []).map((s) => ({
      id: s.id,
      name: s.title,
      type: "service" as const,
    })),
  ];

  return (
    <>
      <SkipLink />
      <StorefrontNav sections={navigation} />
      <StorefrontCommand navigation={navigation} commerceItems={commerceItems} />
      {isPreview && (
        <div
          className="sticky top-0 z-50 bg-amber-900/80 backdrop-blur-sm text-center py-1.5 text-[10px] font-semibold uppercase tracking-widest text-amber-200"
          role="alert"
        >
          Preview Mode — changes are not public
        </div>
      )}
      {/* RCCF-RESPONSIVE-02/03: `<main>` is the named `@container/main` boundary
          for container-query breakpoint variants (@sm/main:@lg/main:) used by
          renderers — on live the container width equals the viewport, so they
          behave exactly like sm:/lg:. The Builder canvas uses the same named
          container with its device frame. */}
      <main suppressHydrationWarning id="main-content" className="@container/main theme-root min-h-screen bg-[var(--surface-root,#0A0A0B)] text-[var(--text-primary,#FAFAFA)] pb-[calc(var(--mobile-nav-height,3.75rem)+env(safe-area-inset-bottom))] md:pb-0" style={theme as React.CSSProperties} data-runtime-signature={runtimeSignature}>
        {jsonLd.map((ld: Record<string, unknown>, i: number) => (
          <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(ld) }} />
        ))}
        {pageSlug && target && (
          <StorefrontBreadcrumbs domain={domain} pageSlug={pageSlug} pageName={target.name} getPageHref={getPageHref} />
        )}
        {(() => {
          // 06E-FIX: dedicated footer composition — footer is not a generic section
          const bodySections = sections.filter((s) => !s.moduleId.startsWith("footer."));
          const footerSections = sections.filter((s) => s.moduleId.startsWith("footer."));
          return (
            <>
              {/* RCCF-BUILDER-06D: page owns the ambient background — sections compose transparently over it. */}
              <PageExperience experience={experience}>
                {bodySections.map((section, i) => {
                  const isHero = i === 0 && section.moduleId.startsWith("hero.");
                  const sectionVariant = isHero ? "hero" as const : "default" as const;
                  const flow = (doc.renderingHints as unknown as { flow?: Record<string, string> })?.flow?.[section.id] as
                    | "shared"
                    | "bleed"
                    | "overlap"
                    | "softSeparator"
                    | "isolated"
                    | undefined;
                  const isInteractionSection =
                    section.moduleId.startsWith("contact.") || section.moduleId.startsWith("newsletter.");
                  const config = isInteractionSection
                    ? { ...(section.config ?? {}), tenantId: data.tenantId }
                    : section.config;
                  return (
                    <ExperienceSection
                      key={`${section.id}-${i}`}
                      id={section.moduleId?.split(".")[0] ?? `section-${i}`}
                      experience={experience}
                      index={i}
                      variant={sectionVariant}
                      divider="bottom"
                      flow={flow}
                      hasContent={section.config.hasContent as boolean | undefined}
                      data-testid={`experience-section-${i}`}
                    >
                      <ComponentErrorBoundary componentId={section.moduleId}>
                        <DataBoundRenderer slot={{ moduleId: section.moduleId, config }} previewMode={isPreview} />
                      </ComponentErrorBoundary>
                    </ExperienceSection>
                  );
                })}
              </PageExperience>
              {/* Premium editorial: trust/social proof sits BEFORE the footer (social proof → footer hierarchy), not after */}
              <TrustIndicators declaredFacts={snap.content?.declaredFacts} />
              {/* 06E-FIX: dedicated footer — semantic <footer>, centered, deliberate separation from Contact */}
              {/* RCCF-LAUNCH-18: footer is data-driven + tenant-local. Anchor links (#products etc) are
                  filtered against actually visible sections; legal links are tenant-prefixed. */}
              {footerSections.map((section) => {
                const rawConfig = section.config as Record<string, unknown>;
                // Visible section ids for filtering (e.g., "products" from "products.grid")
                const visibleIds = new Set(
                  filteredSections.map((s) => (s.moduleId?.split(".")[0] ?? s.id ?? "").toLowerCase())
                );
                const tenantPrefix = `/${domain}`;
                function isSectionVisible(anchorId: string): boolean {
                  return visibleIds.has(anchorId.toLowerCase());
                }
                // Transform footerColumns: tenant-local legal + drop dead anchors
                const rawColumns = (rawConfig.footerColumns as Array<{ title: string; links: Array<{ label: string; href: string }> }> | undefined);
                const sourceCols = Array.isArray(rawColumns) && rawColumns.length > 0 ? rawColumns : footerService.defaultColumns;
                const transformedColumns = sourceCols
                  .map((col) => ({
                    ...col,
                    links: col.links
                      .map((l) => {
                        // Legal: tenant-local
                        if (l.href === "/privacy" || l.href === "/terms" || l.href === "/refund") {
                          return { ...l, href: `${tenantPrefix}${l.href}` };
                        }
                        return l;
                      })
                      .filter((l) => {
                        // Anchor: keep only if section visible
                        if (l.href.startsWith("#")) {
                          const anchorId = l.href.slice(1).toLowerCase();
                          return isSectionVisible(anchorId);
                        }
                        // href "#" or empty is dead — remove
                        if (l.href === "#" || l.href.trim() === "") return false;
                        return true;
                      }),
                  }))
                  .filter((col) => col.links.length > 0);
                const config = { ...rawConfig, footerColumns: transformedColumns, tenantDomain: domain };
                return (
                  <footer
                    key={`footer-${section.id}`}
                    data-testid="storefront-footer"
                    className="border-t border-[var(--border,rgba(0,0,0,0.08))] bg-[var(--surface-root,#0A0A0B)]"
                  >
                    <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
                      <ComponentErrorBoundary componentId={section.moduleId}>
                        <DataBoundRenderer slot={{ moduleId: section.moduleId, config }} previewMode={isPreview} />
                      </ComponentErrorBoundary>
                    </div>
                  </footer>
                );
              })}
              {footerSections.length === 0 && (
                <footer data-testid="storefront-footer" className="border-t border-[var(--border,rgba(0,0,0,0.08))] bg-[var(--surface-root,#0A0A0B)]">
                  <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-[var(--text-muted,#71717A)]">
                    © {snap.content.identity.name || "CreatorStore"}
                  </div>
                </footer>
              )}
            </>
          );
        })()}
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
