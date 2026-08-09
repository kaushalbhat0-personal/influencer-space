/**
 * Platform Domain Resolution — shared by middleware and storefront URL helpers.
 *
 * Any host NOT in this list is treated as a tenant host. The list is derived
 * from the deployment environment so the actual deployment domain is always
 * recognized as a platform domain — a hardcoded list that omits the real
 * domain rewrites the platform host as a tenant host, which produces a 404 on
 * every storefront URL while /admin and /builder keep working.
 */

export function getPlatformDomains(): string[] {
  const domains = new Set<string>(["localhost:3000", "influencer-space-alpha.vercel.app"]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const u = new URL(appUrl);
      if (u.host) domains.add(u.host);
      if (u.hostname && u.hostname !== u.host) domains.add(u.hostname);
    } catch {
      // Ignore malformed app URL.
    }
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) domains.add(vercelUrl);

  const extra = process.env.PLATFORM_DOMAINS;
  if (extra) {
    for (const d of extra.split(",")) {
      const trimmed = d.trim();
      if (trimmed) domains.add(trimmed);
    }
  }

  return Array.from(domains);
}
