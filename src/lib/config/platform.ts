export function getPlatformConfig() {
  return {
    baseDomain: process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN || process.env.PLATFORM_BASE_DOMAIN || "creatorspace.app",
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, ""),
  };
}

export function buildStorefrontUrl(subdomain: string): string {
  const { baseDomain } = getPlatformConfig();
  return `https://${subdomain}.${baseDomain}`;
}

export function buildDashboardUrl(subdomain: string): string {
  const { baseDomain } = getPlatformConfig();
  return `https://${subdomain}.${baseDomain}/admin/dashboard`;
}

export function buildAdminEmail(subdomain: string): string {
  const { baseDomain } = getPlatformConfig();
  return `admin@${subdomain}.${baseDomain}`;
}

export function buildStorefrontUrlWithTenant(customDomain: string | null | undefined, slug: string): string {
  const { baseDomain } = getPlatformConfig();
  return customDomain ? `https://${customDomain}` : `https://${slug}.${baseDomain}`;
}

export function buildAdminLoginUrl(): string {
  return `${getPlatformConfig().appUrl}/admin/login`;
}

export function buildSuperAdminUrl(): string {
  return `${getPlatformConfig().appUrl}/super-admin`;
}

export function buildTenantAdminUrl(tenantId: string): string {
  return `${getPlatformConfig().appUrl}/super-admin/tenants/${tenantId}`;
}

export function buildCreatorDashboardUrl(slug: string): string {
  return buildDashboardUrl(slug);
}

export function buildShowcaseUrl(): string {
  return `${getPlatformConfig().appUrl}/showcase`;
}

export function buildPreviewUrl(slug: string, customDomain?: string | null): string {
  return `${buildStorefrontUrlWithTenant(customDomain, slug)}?preview=true`;
}

export function buildSiteUrlForAdmin(customDomain: string | null | undefined, slug: string): string {
  return customDomain ? `https://${customDomain}` : `/${slug}`;
}
