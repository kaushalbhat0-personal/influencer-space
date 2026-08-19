import { prisma } from "@/lib/prisma";
import type { NavigationItem } from "@/types/snapshot";
import { BuilderService } from "@/lib/builder/builder-service";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { buildRuntimeSnapshot } from "@/lib/storefront/build-snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import {
  renderableNavBases,
  generateDefaultNavigation,
  reconcileNavigation,
} from "./reconcile";

const NAV_KEY = "navigation" as const;

export class NavigationService {
  async get(tenantId: string): Promise<NavigationItem[]> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: NAV_KEY } },
      select: { value: true },
    });
    if (setting?.value && Array.isArray(setting.value)) {
      return JSON.parse(JSON.stringify(setting.value)) as NavigationItem[];
    }
    return [];
  }

  async save(tenantId: string, items: NavigationItem[]): Promise<void> {
    const sanitized = JSON.parse(JSON.stringify(items));
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: NAV_KEY } },
      create: { tenantId, key: NAV_KEY, value: sanitized },
      update: { value: sanitized },
    });
  }

  /**
   * Load the tenant's builder layout + aggregate + goal profile and resolve the
   * renderable section graph through the SAME pipeline the published storefront
   * uses (buildRuntimeSnapshot → layoutEngine.resolve → renderableNavBases).
   * No content-count derivation, no unconditional Contact. Used for initial
   * generation and the nav-editor "Reset to Defaults".
   */
  async generateDefaults(tenantId: string): Promise<NavigationItem[]> {
    const website = await prisma.website.findUnique({
      where: { tenantId },
      select: {
        id: true,
        themePackageId: true,
        themeColors: true,
        themeFonts: true,
        themeConfig: true,
      },
    });
    if (!website) return [];

    const builderPages = await new BuilderService().load(website.id);
    const aggResult = await websiteAggregateService.buildWithDiagnostics(tenantId);
    const { goalProfileService } = await import("@/modules/goals-runtime");
    const goalProfilePresent = !!(await goalProfileService.getProfile(tenantId));

    const snapshot = buildRuntimeSnapshot({
      websiteId: website.id,
      correlationId: `defaultnav_${website.id}`,
      builderPages,
      aggregate: aggResult.aggregate,
      navItems: [],
      themePackageId: website.themePackageId,
      themeColors: (website.themeColors ?? {}) as Record<string, string>,
      themeFonts: (website.themeFonts ?? {}) as Record<string, string>,
      themeConfig: (website.themeConfig ?? {}) as Record<string, string>,
    });
    const doc = layoutEngine.resolve({ ...snapshot, content: aggResult.aggregate });
    const home = doc.pages.find((p) => p.isHome) ?? doc.pages[0];
    const graphBases = renderableNavBases(home?.sections ?? [], aggResult.aggregate, goalProfilePresent);

    const nav = generateDefaultNavigation(graphBases);
    await this.save(tenantId, nav);
    return nav;
  }

  async getOrGenerate(tenantId: string): Promise<NavigationItem[]> {
    const existing = await this.get(tenantId);
    if (existing.length > 0) return existing;
    return this.generateDefaults(tenantId);
  }

  async resetToDefaults(tenantId: string): Promise<NavigationItem[]> {
    return this.generateDefaults(tenantId);
  }

  /**
   * RCCF-72.11 — reconcile the persisted navigation against the CURRENT
   * renderable section graph, persist the result, and return it for snapshot
   * baking. `graphBases` is derived by the caller from the same resolved
   * document that is written to the snapshot, so navigation and layout never
   * diverge. Manual overrides are preserved; generated anchors that no longer
   * render are removed; new ones are appended.
   */
  async reconcileForPublish(
    tenantId: string,
    graphBases: string[],
    existing?: NavigationItem[],
  ): Promise<NavigationItem[]> {
    const current = existing ?? (await this.get(tenantId));
    const reconciled = reconcileNavigation(current, graphBases);
    await this.save(tenantId, reconciled);
    return reconciled;
  }
}

export const navigationService = new NavigationService();
