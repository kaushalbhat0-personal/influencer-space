import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface QualityCheckContext {
  tenantId: string;
  tenant: { id: string; name: string; subdomain: string } | null;
  productCount: number;
  brandConfig: Record<string, unknown> | undefined;
  seoConfig: Record<string, unknown> | undefined;
}

export interface CheckResult {
  label: string;
  passed: boolean;
  detail?: string;
}

export interface QualityCheckPlugin {
  id: string;
  name: string;
  weight: number;
  run(ctx: QualityCheckContext): CheckResult;
}

export interface QualityReport {
  tenantId: string;
  overall: boolean;
  checks: CheckResult[];
  score: number;
  published: boolean;
}

class TenantExistsCheck implements QualityCheckPlugin {
  id = "tenant-exists"; name = "Tenant exists"; weight = 1;
  run(ctx: QualityCheckContext): CheckResult {
    return { label: "Tenant exists", passed: ctx.tenant !== null };
  }
}

class ProductsCheck implements QualityCheckPlugin {
  id = "products"; name = "Products (min 1)"; weight = 2;
  run(ctx: QualityCheckContext): CheckResult {
    return { label: "Products (min 1)", passed: ctx.productCount > 0, detail: `${ctx.productCount} products` };
  }
}

class BrandNameCheck implements QualityCheckPlugin {
  id = "brand-name"; name = "Brand name"; weight = 1;
  run(ctx: QualityCheckContext): CheckResult {
    return { label: "Brand name", passed: !!ctx.brandConfig?.name };
  }
}

class HeroTextCheck implements QualityCheckPlugin {
  id = "hero-text"; name = "Hero text"; weight = 1;
  run(ctx: QualityCheckContext): CheckResult {
    return { label: "Hero text", passed: !!ctx.brandConfig?.heroTitle };
  }
}

class AboutTextCheck implements QualityCheckPlugin {
  id = "about-text"; name = "About text"; weight = 1;
  run(ctx: QualityCheckContext): CheckResult {
    return { label: "About text", passed: !!ctx.brandConfig?.aboutText };
  }
}

class SeoTitleCheck implements QualityCheckPlugin {
  id = "seo-title"; name = "SEO title"; weight = 1;
  run(ctx: QualityCheckContext): CheckResult {
    return { label: "SEO title", passed: !!ctx.seoConfig?.title };
  }
}

class SeoDescCheck implements QualityCheckPlugin {
  id = "seo-desc"; name = "SEO description"; weight = 1;
  run(ctx: QualityCheckContext): CheckResult {
    return { label: "SEO description", passed: !!(ctx.seoConfig?.description || ctx.seoConfig?.title) };
  }
}

class BrandPaletteCheck implements QualityCheckPlugin {
  id = "brand-palette"; name = "Brand palette"; weight = 1;
  run(ctx: QualityCheckContext): CheckResult {
    return { label: "Brand palette", passed: !!ctx.brandConfig?.palette };
  }
}

export class QualityGate {
  private static plugins: QualityCheckPlugin[] = [];

  static register(plugin: QualityCheckPlugin) {
    this.plugins.push(plugin);
  }

  static unregister(id: string) {
    this.plugins = this.plugins.filter((p) => p.id !== id);
  }

  static clear() {
    this.plugins = [];
  }

  static async run(tenantId: string): Promise<QualityReport> {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, subdomain: true } });
    if (!tenant) {
      return { tenantId, overall: false, checks: [{ label: "Tenant exists", passed: false }], score: 0, published: false };
    }

    const productCount = await prisma.product.count({ where: { tenantId } });
    const settings = await prisma.setting.findMany({ where: { tenantId } });
    const brandConfig = settings.find((s) => s.key === "brand_config")?.value as Record<string, unknown> | undefined;
    const seoConfig = settings.find((s) => s.key === "seo")?.value as Record<string, unknown> | undefined;

    const ctx: QualityCheckContext = { tenantId, tenant, productCount, brandConfig, seoConfig };
    const results = this.plugins.map((p) => ({ plugin: p, result: p.run(ctx) }));

    const totalWeight = results.reduce((s, r) => s + r.plugin.weight, 0);
    const passedWeight = results.filter((r) => r.result.passed).reduce((s, r) => s + r.plugin.weight, 0);
    const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
    const overall = results.every((r) => r.result.passed);

    let published = false;
    if (overall && score === 100) {
      const demoMeta = settings.find((s) => s.key === "demo_metadata");
      if (demoMeta) {
        const val = demoMeta.value as Record<string, unknown>;
        val.published = true;
        await prisma.setting.update({
          where: { id: demoMeta.id },
          data: { value: val as Prisma.InputJsonValue },
        });
        published = true;
      }
    }

    return {
      tenantId,
      overall,
      checks: results.map((r) => r.result),
      score,
      published,
    };
  }

  static getPlugins(): QualityCheckPlugin[] {
    return [...this.plugins];
  }
}

QualityGate.register(new TenantExistsCheck());
QualityGate.register(new ProductsCheck());
QualityGate.register(new BrandNameCheck());
QualityGate.register(new HeroTextCheck());
QualityGate.register(new AboutTextCheck());
QualityGate.register(new SeoTitleCheck());
QualityGate.register(new SeoDescCheck());
QualityGate.register(new BrandPaletteCheck());
