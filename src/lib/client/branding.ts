import { prisma } from "@/lib/prisma";

export interface AgencyBrand {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  faviconUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  footerText: string | null;
}

const DEFAULT_BRAND: AgencyBrand = {
  logoUrl: null,
  primaryColor: "#6366F1",
  accentColor: "#00f5ff",
  faviconUrl: null,
  supportEmail: null,
  supportPhone: null,
  footerText: null,
};

const BRANDING_KEY = "agency_branding";

export class AgencyBrandingService {
  async getBrand(agencyId: string): Promise<AgencyBrand> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId: agencyId, key: BRANDING_KEY } },
    });
    if (!setting?.value) return { ...DEFAULT_BRAND };
    return { ...DEFAULT_BRAND, ...(setting.value as Partial<AgencyBrand>) };
  }

  async updateBrand(agencyId: string, brand: Partial<AgencyBrand>): Promise<AgencyBrand> {
    const current = await this.getBrand(agencyId);
    const updated = { ...current, ...brand };
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: agencyId, key: BRANDING_KEY } },
      update: { value: JSON.parse(JSON.stringify(updated)) },
      create: { tenantId: agencyId, key: BRANDING_KEY, value: JSON.parse(JSON.stringify(updated)) },
    });
    return updated;
  }

  cssVars(brand: AgencyBrand): Record<string, string> {
    return {
      "--agency-primary": brand.primaryColor,
      "--agency-accent": brand.accentColor,
      ...(brand.logoUrl ? { "--agency-logo": `url(${brand.logoUrl})` } : {}),
    };
  }
}

export const agencyBranding = new AgencyBrandingService();
