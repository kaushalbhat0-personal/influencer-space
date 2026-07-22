let cachedConfig: { appUrl: string } | null = null;

function getConfig() {
  if (!cachedConfig) {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
    cachedConfig = { appUrl };
  }
  return cachedConfig;
}

export class PlatformUrlService {
  getAppUrl(): string {
    return getConfig().appUrl;
  }

  getAppDomain(): string {
    return new URL(getConfig().appUrl).hostname;
  }

  buildStorefrontUrl(slug: string): string {
    return `${getConfig().appUrl}/${slug}`;
  }

  buildStorefrontUrlWithTenant(customDomain: string | null | undefined, slug: string): string {
    return customDomain ? `https://${customDomain}` : `${getConfig().appUrl}/${slug}`;
  }

  buildDashboardUrl(): string {
    return `${getConfig().appUrl}/admin/dashboard`;
  }

  buildAdminEmail(slug: string): string {
    return `admin-${slug}@${this.getAppDomain()}`;
  }

  buildAdminLoginUrl(): string {
    return `${getConfig().appUrl}/admin/login`;
  }

  buildSuperAdminUrl(): string {
    return `${getConfig().appUrl}/super-admin`;
  }

  buildTenantAdminUrl(tenantId: string): string {
    return `${getConfig().appUrl}/super-admin/tenants/${tenantId}`;
  }

  buildCreatorDashboardUrl(): string {
    return this.buildDashboardUrl();
  }

  buildShowcaseUrl(): string {
    return `${getConfig().appUrl}/showcase`;
  }

  buildPreviewUrl(slug: string, customDomain?: string | null): string {
    return `${this.buildStorefrontUrlWithTenant(customDomain, slug)}?preview=true`;
  }

  buildSiteUrlForAdmin(customDomain: string | null | undefined, slug: string): string {
    return customDomain ? `https://${customDomain}` : `/${slug}`;
  }
}

export const platformUrls = new PlatformUrlService();
