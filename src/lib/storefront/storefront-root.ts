/**
 * Storefront root path — RCCF-IMPLEMENTATION-09B (Phase 3).
 *
 * Collection "View all" CTAs and page-type navigation need hrefs that are
 * correct on BOTH host setups:
 *   - Tenant subdomain / custom domain:  storefront root is "/"   → "/products"
 *   - Platform-domain storefront slug:   storefront root is "/{domain}" → "/owais/products"
 *
 * This reads the current request host (server component) and compares against
 * the platform domains so links resolve to the right absolute path regardless
 * of how the fan reached the site. Falls back to "/" when the host is unknown.
 */

import { headers } from "next/headers";
import { getPlatformDomains } from "@/lib/platform/domains";

/** Root-relative storefront base path for the current request host. */
export function getStorefrontRootPath(domain: string): string {
  try {
    const host = headers().get("host") ?? "";
    const hostname = host.split(":")[0]?.replace(/^www\./, "") ?? "";
    const platforms = getPlatformDomains().map((d) => d.split(":")[0]);
    const isPlatformHost =
      platforms.includes(hostname) || platforms.some((p) => hostname.endsWith(`.${p}`));
    if (isPlatformHost) return `/${domain}`;
    return "/";
  } catch {
    return `/${domain}`;
  }
}

/** Absolute (root-relative) href for a page slug on the current storefront. */
export function getPageHref(domain: string, pageSlug: string): string {
  const normalized = pageSlug.replace(/^\/+/, "").toLowerCase();
  return `${getStorefrontRootPath(domain)}/${normalized}`.replace(/\/+/g, "/");
}
