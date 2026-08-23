/**
 * Publishing Service v2.1.0
 *
 * Canonical publish pipeline — single source of truth for publish state.
 *
 * Flow:
 *   validate → repository (transaction) → commit
 *   → event dispatch (fire-and-forget)
 *   → cache invalidation (fire-and-forget)
 *
 * Correlation flows through CorrelationContext, never self-generated.
 * Events and cache are explicitly after the transaction commits.
 */

import { prisma } from "@/lib/prisma";
import { buildStorefrontUrlWithTenant, buildPreviewUrl } from "@/lib/config/platform";
import { platformEventBus } from "@/lib/events";
import { revalidatePath } from "next/cache";
import { safeCorrelationId } from "@/lib/platform/correlation/context";
import type { CorrelationContext } from "@/lib/platform/correlation/types";
import type { BuilderPage } from "@/lib/builder/types";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { navigationService } from "@/lib/navigation/service";
import { resolveModuleId } from "@/lib/registry/resolve-module";
import { workspacePolicy } from "@/lib/workspace/policy";
import type { PublishedSnapshot } from "@/types/snapshot";
import { buildRuntimeSnapshot } from "@/lib/storefront/build-snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { renderableNavBases } from "@/lib/navigation/reconcile";
import { publishRepository } from "@/modules/tenant/infrastructure/publishing-repository";
import { logger } from "@/lib/observability/logger";
import { runWorkflow } from "@/lib/observability/workflow-diagnostics";
import { captureError } from "@/lib/observability/error-tracker";
import { metricsService } from "@/lib/observability/metrics-service";
import { traceRuntime } from "@/lib/observability/runtime-trace";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { themeRegistry } from "@/lib/theme/registry-new";
import { experienceRegistry, requiredCapabilitiesForExperience } from "@/modules/theme/runtime/experience";
import { capabilityEngine } from "@/lib/capabilities";
import { resolvePublishPolicy, suggestedPublishUpgrade, type PublishPolicy } from "./publish-policy";
import { computePublishPeriod } from "./publish-period";
import { planUsageRepository, PUBLISH_FEATURE_KEY } from "@/modules/billing/infrastructure/plan-usage-repository";
import { isTrialExpiredForTenant } from "./publish-usage";

/**
 * RCCF-LAUNCH-POLISH-06 (Phase 9): a canonical, machine-readable capability
 * validation result. Publishing VALIDATES theme capabilities against the
 * tenant's plan and surfaces these issues — the storefront enforces the actual
 * fallback. Non-blocking so existing free creators (who already have premium
 * themes applied) can still publish; the builder prevents new premium selections.
 */
export interface CapabilityIssue {
  code: string; // canonical capability id, e.g. "theme_background_gradient"
  label: string;
  plan: string | null;
  severity: "warning";
}

export type PublishState = "draft" | "preview" | "live" | "archived";

export interface PublishStatus {
  state: PublishState;
  publishedAt: string | null;
  version: number;
  previewUrl: string | null;
  storefrontUrl: string | null;
}

export class PublishingService {
  async getStatus(tenantId: string): Promise<{ success: boolean; data?: PublishStatus; error?: string }> {
    try {
      const [tenant, website] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { subdomain: true, customDomain: true },
        }),
        prisma.website.findUnique({
          where: { tenantId },
          select: {
            publishStatus: { select: { state: true, liveVersion: true, publishedAt: true } },
          },
        }),
      ]);
      if (!tenant) return { success: false, error: "Tenant not found" };

      const storeRoot = buildStorefrontUrlWithTenant(tenant.customDomain, tenant.subdomain);
      const dbStatus = website?.publishStatus;

      return {
        success: true,
        data: {
          state: (dbStatus?.state as PublishState) ?? "draft",
          publishedAt: dbStatus?.publishedAt?.toISOString() ?? null,
          version: dbStatus?.liveVersion ?? 0,
          previewUrl: `${storeRoot}?preview=true`,
          storefrontUrl: storeRoot,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Status check failed" };
    }
  }

  async publish(
    tenantId: string,
    correlation?: CorrelationContext,
  ): Promise<{
    success: boolean;
    version?: number;
    error?: string;
    capabilityIssues?: CapabilityIssue[];
    code?: string;
    used?: number;
    limit?: number;
    periodStart?: string;
    periodEnd?: string | null;
    mode?: string;
    suggestedUpgrade?: "growth" | "scale" | null;
  }> {
    const startTime = Date.now();
    logger.info("Publishing started", "publishing", { correlation, metadata: { tenantId } });
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, subdomain: true, customDomain: true, createdAt: true },
      });
      if (!tenant) return { success: false, error: "Tenant not found" };

      // Storefront routing must exist before a publish can go live. Without a
      // subdomain or custom domain the storefront route ([domain]) can never
      // resolve the tenant, so the publish would produce a dead URL.
      if (!tenant.subdomain && !tenant.customDomain) {
        return {
          success: false,
          error: "Storefront routing is not configured. Set a subdomain or custom domain before publishing.",
        };
      }

      const workspace = await prisma.workspace.findUnique({ where: { tenantId } });
      if (workspace) {
        try {
          await workspacePolicy.assertCanPublish(workspace.id);
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : "Cannot publish" };
        }
      }

      const website = await prisma.website.findUnique({
        where: { tenantId },
        select: { id: true },
      });
      if (!website) return { success: false, error: "Website not found. Complete onboarding first." };

      // RCCF-34: the expired Launch trial blocks NEW publishes while preserving
      // the existing live snapshot and drafts. Initial provisioning happens
      // during the active trial (fresh signup → TRIALING with future
      // trialEndsAt), so it is unaffected. Upgrade (ACTIVE) restores publishing.
      if (await isTrialExpiredForTenant(tenantId)) {
        return {
          success: false,
          code: "PUBLISH_TRIAL_EXPIRED",
          suggestedUpgrade: "growth",
          error: "Your Launch trial has ended. Your website remains live, but publishing new changes requires an active subscription. Upgrade to Growth to continue publishing.",
        };
      }

      const websiteId = website.id;
      const storeRoot = buildStorefrontUrlWithTenant(tenant.customDomain, tenant.subdomain);

      const [builderPages, websiteFull, aggResult, correlationId] = await Promise.all([
        this.loadBuilderPages(websiteId),
        prisma.website.findUnique({
          where: { id: websiteId },
          select: { themePackageId: true, themeColors: true, themeFonts: true, themeConfig: true },
        }),
        // RCCF-72.17C.2: also return the shared reads so the homepage aggregate
        // build below can reuse them (identical committed rows, same request).
        websiteAggregateService.buildWithDiagnosticsAndShared(tenantId),
        Promise.resolve(safeCorrelationId(correlation)),
      ]);
      const aggregate = aggResult.aggregate;
      const { invalidAssetIds, skippedAssets, moduleFailures } = aggResult;

      // RCCF-02: bake the homepage-curated aggregate (featured-first, capped)
      // so the published homepage renders snapshot-only. Built once at publish
      // with the same curation the live path used; no render-time aggregation.
      let resolvedHomepage: Awaited<ReturnType<typeof websiteAggregateService.build>> | null = null;
      try {
        // RCCF-72.17C.2: reuse the full build's shared reads instead of
        // re-querying them (~9 fewer round-trips). Output is identical to the
        // previous `build(tenantId, { homepage: true })`.
        resolvedHomepage = await websiteAggregateService.buildHomepageFromShared(tenantId, aggResult.sharedReads);
      } catch (err) {
        captureError(err, { service: "publishing", operation: "publish-homepage-aggregate", tenantId });
      }

      const blocking = await this.collectBlockingIssues(builderPages);
      if (blocking.length > 0) {
        return { success: false, error: blocking.join("; ") };
      }

      // RCCF-LAUNCH-POLISH-06 (Phase 9): validate the theme's visual capabilities
      // against the tenant's plan. Canonical, non-blocking issues (existing free
      // creators keep publishing; the storefront enforces the fallback).
      const capabilityIssues = await this.validateThemeCapabilities(tenantId, websiteFull?.themePackageId ?? null);

      // RCCF-02: bake the capability-resolved experience + storefront gates so
      // the published storefront reads NO live business tables (no plan lookups,
      // no goal-profile reads, no platform-flag reads) at render time.
      const [goalProfilePresent, maintenanceMode, resolvedExperience] = await Promise.all([
        (async () => {
          const { goalProfileService } = await import("@/modules/goals-runtime");
          return !!(await goalProfileService.getProfile(tenantId));
        })(),
        (async () => {
          const { isFlagEnabled } = await import("@/lib/platform/platform-config");
          return isFlagEnabled("maintenanceMode");
        })(),
        (async () => {
          const themeDef = websiteFull?.themePackageId ? themeRegistry.getById(websiteFull.themePackageId) : undefined;
          const base = experienceRegistry.resolve({
            id: websiteFull?.themePackageId ?? null,
            category: themeDef?.category ?? null,
            premium: themeDef?.premium ?? null,
          });
          const { resolveExperienceForCapabilities, applyExperienceOverride } = await import("@/modules/theme/runtime/experience");
          const active = await resolveActivePlan(undefined, tenantId);
          // RCCF-71.2: the creator's background/surface overrides (persisted in
          // Website.themeConfig) are applied to the base experience BEFORE
          // capability resolution — the canonical Capability Runtime still
          // governs what the plan actually renders.
          const overridden = applyExperienceOverride(base, (websiteFull?.themeConfig ?? {}) as Record<string, string>);
          return resolveExperienceForCapabilities(overridden, active?.code ?? null);
        })(),
      ]);

      const websiteColors = websiteFull?.themeColors as Record<string, string> | null ?? {};
      const websiteFonts = websiteFull?.themeFonts as Record<string, string> | null ?? {};
      const websiteThemeConfig = websiteFull?.themeConfig as Record<string, string> | null ?? {};

      const buildStart = Date.now();
      // RCCF-72.11 — build the snapshot with the CURRENT persisted navigation,
      // then derive the renderable section graph from the SAME resolved document
      // the published storefront renders (layoutEngine.resolve + the render
      // filter), and reconcile navigation against that graph before baking the
      // final navigation. This is the single canonical graph: layout and nav can
      // never diverge, and manual overrides always survive.
      const existingNav = await navigationService.get(tenantId);
      const runtimeSnapshot = buildRuntimeSnapshot({
        websiteId,
        correlationId,
        builderPages,
        aggregate,
        navItems: existingNav,
        themePackageId: websiteFull?.themePackageId ?? null,
        themeColors: websiteColors,
        themeFonts: websiteFonts,
        themeConfig: websiteThemeConfig,
        homepageAggregate: resolvedHomepage ?? undefined,
        goalProfilePresent,
        maintenanceMode,
        experience: resolvedExperience,
      });
      const doc = layoutEngine.resolve({ ...runtimeSnapshot, content: resolvedHomepage ?? aggregate });
      const home = doc.pages.find((p) => p.isHome) ?? doc.pages[0];
      const graphBases = renderableNavBases(home?.sections ?? [], resolvedHomepage ?? aggregate, goalProfilePresent);
      const navItems = await navigationService.reconcileForPublish(tenantId, graphBases, existingNav);
      runtimeSnapshot.navigation = navItems.map((n) => ({
        id: n.id,
        label: n.label,
        href: n.href,
        type: n.type,
        order: n.order,
        visible: n.visible,
        ...(n.target ? { target: n.target } : {}),
        ...(n.icon ? { icon: n.icon } : {}),
      }));
      const buildMs = Date.now() - buildStart;

      traceRuntime({
        runtimeType: "publish",
        creator: aggregate.identity?.name || "",
        theme: runtimeSnapshot.theme,
        layout: runtimeSnapshot.layout,
        aggregate,
        websiteId,
        tenantId,
        slug: tenant.subdomain ?? tenant.customDomain ?? null,
        correlationId,
        timings: { aggregateMs: buildMs, totalMs: buildMs },
        diagnostics: { invalidAssetIds, skippedAssets, moduleFailures },
      });

      // RCCF-01: publish bakes the CANONICAL aggregate (WebsiteAggregateService
      // output) into the PublishedSnapshot so the snapshot is self-contained.
      // RCCF-02: the published storefront reads ONLY this snapshot — no live
      // business-table reads, no content reconstruction, no plan/billing lookups.
      const canonicalSnapshot: PublishedSnapshot = {
        ...runtimeSnapshot,
        content: aggregate,
      };

      // RCCF-31: resolve the effective publish policy (defaults + Super Admin
      // runtimeConfig.publishing) and commit quota + snapshot atomically.
      const publishPlanCode = (await resolveActivePlan(undefined, tenantId)).code;
      const publishPolicy = await resolvePublishPolicy(publishPlanCode);
      const commit = await this.commitPublishWithMetering({
        tenantId,
        websiteId,
        canonicalSnapshot,
        policy: publishPolicy,
        tenantCreatedAt: tenant.createdAt,
        planCode: publishPlanCode,
      });
      if (!commit.ok) {
        return {
          success: false,
          code: "PUBLISH_QUOTA_EXCEEDED",
          used: commit.used,
          limit: commit.limit,
          periodStart: commit.periodStart,
          periodEnd: commit.periodEnd,
          mode: commit.mode,
          suggestedUpgrade: commit.suggestedUpgrade,
          error: `Publish limit reached (${commit.used}/${commit.limit}). Upgrade to continue publishing.`,
        };
      }
      const result = { version: commit.version };

      try {
        platformEventBus.publish("WebsitePublished", {
          tenantId,
          websiteId,
          version: result.version,
          storefrontUrl: storeRoot,
          correlationId,
        });
      } catch {
        // event emission is fire-and-forget; already committed
      }

      try {
        revalidatePath("/", "layout");
        revalidatePath("/admin/dashboard");
        revalidatePath(`/${tenant.subdomain}`);
        if (tenant.customDomain) {
          revalidatePath(`/${tenant.customDomain}`);
        }
      } catch {
        // cache invalidation is fire-and-forget; already committed
      }

      logger.info("Publishing completed", "publishing", { correlation, duration: Date.now() - startTime, metadata: { tenantId, version: result.version, capabilityIssues } });
      metricsService.recordDuration("publish", Date.now() - startTime, { status: "success", tenantId });
      metricsService.recordOutcome("publish", true, { tenantId });
      return { success: true, version: result.version, capabilityIssues };
    } catch (error) {
      captureError(error, { service: "publishing", operation: "publish", correlation, tenantId });
      return { success: false, error: error instanceof Error ? error.message : "Publish failed" };
    }
  }

  /**
   * RCCF-31 — atomic publish commit with quota metering.
   *
   * Unlimited plans: create the snapshot as today (no usage row).
   *
   * Lifetime/Monthly plans: reserve one quota slot and create the
   * PublishedSnapshot + PublishStatus update in a SINGLE transaction, so a
   * failed snapshot rolls the quota back and an exhausted quota writes nothing.
   * The reservation uses an atomic conditional increment (`used < limit`),
   * making concurrent final-slot publishes mutually exclusive.
   */
  async commitPublishWithMetering(params: {
    tenantId: string;
    websiteId: string;
    canonicalSnapshot: PublishedSnapshot;
    policy: PublishPolicy;
    tenantCreatedAt: Date;
    planCode?: string | null;
  }): Promise<
    | { ok: true; version: number }
    | { ok: false; used: number; limit: number; periodStart: string; periodEnd: string | null; mode: string; suggestedUpgrade: "growth" | "scale" | null }
  > {
    const { tenantId, websiteId, canonicalSnapshot, policy, tenantCreatedAt, planCode } = params;

    if (policy.mode === "unlimited") {
      const result = await publishRepository.createPublish(websiteId, canonicalSnapshot);
      return { ok: true, version: result.version };
    }

    const period = computePublishPeriod(policy.mode, tenantCreatedAt, new Date());
    const txResult = await prisma.$transaction(async (tx) => {
      const reserved = await planUsageRepository.reserveSlot(tx, {
        tenantId,
        featureKey: PUBLISH_FEATURE_KEY,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
        limit: policy.limit ?? 0,
      });
      if (!reserved) {
        const usage = await planUsageRepository.getUsage(tx, {
          tenantId,
          featureKey: PUBLISH_FEATURE_KEY,
          periodStart: period.periodStart,
        });
        return { quotaExceeded: true as const, used: usage?.used ?? 0 };
      }
      const result = await publishRepository.createPublish(websiteId, canonicalSnapshot, tx);
      return { quotaExceeded: false as const, version: result.version };
    });

    if (txResult.quotaExceeded) {
      return {
        ok: false,
        used: txResult.used,
        limit: policy.limit ?? 0,
        periodStart: period.periodStart.toISOString(),
        periodEnd: period.periodEnd?.toISOString() ?? null,
        mode: policy.mode,
        suggestedUpgrade: suggestedPublishUpgrade(planCode),
      };
    }
    return { ok: true, version: txResult.version };
  }

  async markChangesPending(tenantId: string): Promise<{ success: boolean; error?: string }> {    try {
      const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
      if (!website) return { success: false, error: "Website not found" };

      const status = await prisma.publishStatus.findUnique({ where: { websiteId: website.id } });
      if (status?.state === "live") {
        await prisma.publishStatus.update({
          where: { websiteId: website.id },
          data: { state: "draft" },
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to mark changes" };
    }
  }

  async rollback(tenantId: string, version: number): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    logger.info("Rollback started", "publishing", { metadata: { tenantId, version } });
    try {
      const website = await prisma.website.findUnique({
        where: { tenantId },
        select: { id: true },
      });
      if (!website) return { success: false, error: "Website not found" };

      const { publishSnapshotService } = await import("./snapshot");
      const data = await publishSnapshotService.rollback(website.id, version);
      if (data.pages.length === 0) {
        return { success: false, error: `Snapshot version ${version} contains no pages` };
      }

      const builderService = await import("@/lib/builder/builder-service").then(
        (m) => new m.BuilderService(),
      );
      await builderService.save(website.id, data.pages);

      // Rollback restores the DRAFT; the live site stays as-is until republish.
      await this.markChangesPending(tenantId);

      logger.info("Rollback completed", "publishing", { duration: Date.now() - startTime, metadata: { tenantId, version } });
      metricsService.recordOutcome("publish", true, { tenantId, operation: "rollback" });
      return { success: true };
    } catch (error) {
      captureError(error, { service: "publishing", operation: "rollback", tenantId });
      return { success: false, error: error instanceof Error ? error.message : "Rollback failed" };
    }
  }

  async getPreviewUrl(tenantId: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subdomain: true, customDomain: true },
      });
      if (!tenant) return { success: false, error: "Tenant not found" };

      return { success: true, data: buildPreviewUrl(tenant.subdomain, tenant.customDomain) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Preview URL failed" };
    }
  }

  async validateBeforePublish(tenantId: string): Promise<{
    success: boolean;
    issues?: string[];
    error?: string;
  }> {
    try {
      const issues: string[] = [];

      const productCount = await prisma.product.count({ where: { tenantId } });
      if (productCount === 0) issues.push("No products. Add at least one product.");

      const hasDomain = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { customDomain: true },
      });
      if (!hasDomain?.customDomain) issues.push("Using subdomain. Consider adding a custom domain.");

      const website = await prisma.website.findUnique({
        where: { tenantId },
        select: { id: true, themePackageId: true },
      });
      if (website) {
        const builderService = await import("@/lib/builder/builder-service").then(
          (m) => new m.BuilderService(),
        );
        const pages = await builderService.load(website.id);
        const blocking = await this.collectBlockingIssues(pages);
        if (blocking.length > 0) issues.push(...blocking);
        if (pages.length === 0) issues.push("No pages. The builder is empty.");

        // RCCF-LAUNCH-POLISH-06 (Phase 9): surface theme-capability warnings.
        const capabilityIssues = await this.validateThemeCapabilities(tenantId, website.themePackageId);
        for (const cap of capabilityIssues) {
          issues.push(`Premium visual "${cap.label}" requires an upgrade (upgrade to Creator Growth). It will render as a solid background on your current plan.`);
        }
      }

      return { success: true, issues };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Validation failed" };
    }
  }

  /**
   * Blocking issues that prevent a publish: no homepage, duplicate slugs,
   * or unknown (unregistered) components. Non-blocking warnings (products,
   * custom domain) are reported separately by validateBeforePublish.
   */
  private async collectBlockingIssues(pages: BuilderPage[]): Promise<string[]> {
    const issues: string[] = [];

    if (pages.length === 0) {
      return ["No pages to publish. Add sections in the builder first."];
    }

    if (!pages.some((p) => p.isHome)) {
      issues.push("No homepage selected. Mark one page as Home.");
    }

    const slugSeen = new Set<string>();
    for (const page of pages) {
      const slug = page.slug || "/";
      if (slugSeen.has(slug)) {
        issues.push(`Duplicate page slug: "${slug}".`);
      }
      slugSeen.add(slug);
    }

    const { componentRegistry } = await import("@/lib/registry/components");
    const unknown = new Set<string>();
    for (const page of pages) {
      for (const section of page.sections) {
        for (const slot of section.slots) {
          const moduleId = resolveModuleId(slot.moduleId);
          if (!componentRegistry.get(moduleId)) {
            unknown.add(moduleId);
          }
        }
      }
    }
    for (const moduleId of Array.from(unknown)) {
      issues.push(`Unknown component: "${moduleId}". Remove it in the builder.`);
    }

    return issues;
  }

  private async loadBuilderPages(websiteId: string): Promise<BuilderPage[]> {
    const builderService = await import("@/lib/builder/builder-service").then(
      (m) => new m.BuilderService(),
    );
    return builderService.load(websiteId);
  }

  /**
   * RCCF-LAUNCH-POLISH-06 (Phase 9): canonical theme-capability validation.
   * Returns the capabilities the tenant's plan lacks for the current theme.
   * Always additive/non-blocking — the storefront is the hard enforcement.
   */
  private async validateThemeCapabilities(
    tenantId: string,
    themePackageId: string | null,
  ): Promise<CapabilityIssue[]> {
    try {
      const active = await resolveActivePlan(undefined, tenantId);
      const planCode = active?.code ?? null;

      const themeDef = themePackageId ? themeRegistry.getById(themePackageId) : undefined;
      const experience = experienceRegistry.resolve({
        id: themePackageId,
        category: themeDef?.category ?? null,
        premium: themeDef?.premium ?? null,
      });

      const issues: CapabilityIssue[] = [];
      for (const cap of requiredCapabilitiesForExperience(experience)) {
        const check = capabilityEngine.can(planCode ?? "", cap);
        if (!check.allowed) {
          issues.push({
            code: cap,
            label: cap.replace(/_/g, " "),
            plan: planCode,
            severity: "warning",
          });
        }
      }
      return issues;
    } catch {
      return [];
    }
  }
}

export const publishingService = new PublishingService();
