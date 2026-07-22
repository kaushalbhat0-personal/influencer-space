function getConfig() {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return { appUrl };
}

export function getPlatformConfig() {
  return getConfig();
}

export function buildStorefrontUrl(slug: string): string {
  return `${getConfig().appUrl}/${slug}`;
}

export function buildDashboardUrl(): string {
  return `${getConfig().appUrl}/admin/dashboard`;
}

export function buildAdminEmail(slug: string): string {
  const domain = new URL(getConfig().appUrl).hostname;
  return `admin-${slug}@${domain}`;
}

export function buildStorefrontUrlWithTenant(customDomain: string | null | undefined, slug: string): string {
  return customDomain ? `https://${customDomain}` : `${getConfig().appUrl}/${slug}`;
}

export function buildAdminLoginUrl(): string {
  return `${getConfig().appUrl}/admin/login`;
}

export function buildSuperAdminUrl(): string {
  return `${getConfig().appUrl}/super-admin`;
}

export function buildTenantAdminUrl(tenantId: string): string {
  return `${getConfig().appUrl}/super-admin/tenants/${tenantId}`;
}

export function buildCreatorDashboardUrl(): string {
  return buildDashboardUrl();
}

export function buildShowcaseUrl(): string {
  return `${getConfig().appUrl}/showcase`;
}

export function buildPreviewUrl(slug: string, customDomain?: string | null): string {
  return `${buildStorefrontUrlWithTenant(customDomain, slug)}?preview=true`;
}

export function buildSiteUrlForAdmin(customDomain: string | null | undefined, slug: string): string {
  return customDomain ? `https://${customDomain}` : `/${slug}`;
}
