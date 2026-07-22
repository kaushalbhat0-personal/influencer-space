export function getPlatformConfig() {
  return {
    baseDomain: process.env.NEXT_PUBLIC_PLATFORM_BASE_DOMAIN || process.env.PLATFORM_BASE_DOMAIN || "creatorspace.app",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
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
