function getConfig() {
  return {
    baseDomain: process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN || process.env.PLATFORM_BASE_DOMAIN || "creatorspace.app",
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, ""),
  };
}

export class PlatformUrlService {
  getBaseDomain(): string {
    return getConfig().baseDomain;
  }

  getAppUrl(): string {
    return getConfig().appUrl;
  }

  buildStorefrontUrl(slug: string): string {
    const { baseDomain } = getConfig();
    return `https://${slug}.${baseDomain}`;
  }

  buildStorefrontUrlWithTenant(customDomain: string | null | undefined, slug: string): string {
    const { baseDomain } = getConfig();
    return customDomain
      ? `https://${customDomain}`
      : `https://${slug}.${baseDomain}`;
  }

  buildDashboardUrl(slug: string): string {
    const { baseDomain } = getConfig();
    return `https://${slug}.${baseDomain}/admin/dashboard`;
  }

  buildAdminEmail(slug: string): string {
    const { baseDomain } = getConfig();
    return `admin@${slug}.${baseDomain}`;
  }

  buildAdminLoginUrl(): string {
    return `${this.getAppUrl()}/admin/login`;
  }

  buildSuperAdminUrl(): string {
    return `${this.getAppUrl()}/super-admin`;
  }

  buildTenantAdminUrl(tenantId: string): string {
    return `${this.getAppUrl()}/super-admin/tenants/${tenantId}`;
  }

  buildCreatorDashboardUrl(slug: string): string {
    return this.buildDashboardUrl(slug);
  }

  buildShowcaseUrl(): string {
    return `${this.getAppUrl()}/showcase`;
  }

  buildPreviewUrl(slug: string, customDomain?: string | null): string {
    return `${this.buildStorefrontUrlWithTenant(customDomain, slug)}?preview=true`;
  }

  buildSiteUrlForAdmin(customDomain: string | null | undefined, slug: string): string {
    return customDomain
      ? `https://${customDomain}`
      : `/${slug}`;
  }
}

export const platformUrls = new PlatformUrlService();
