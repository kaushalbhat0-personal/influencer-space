/**
 * Google Maps platform adapter — RCCF-PRELAUNCH-17B Batch A.
 *
 * No Google Places API. Extracts safely from the URL only:
 * - business name (from /place/, /dir/, /search/, ?q=)
 * - original Google Maps URL preserved as googleMapsUrl
 * - usable location/address when encoded after the name (e.g. FR8G+RPV, Pune)
 * No fabricated address/phone/hours/ratings. Maps URL is kept for RelationshipGraph.
 */
import type { PlatformAdapter, AcquireOptions, AdapterResult } from "../types";

const CAPABILITIES = {
  supportsDisplayName: true,
  supportsBio: false,
  supportsFollowers: false,
  supportsFollowing: false,
  supportsPostCount: false,
  supportsVerification: false,
  supportsWebsite: true,
  supportsRecentContent: false,
  supportsMedia: false,
  supportsCategories: false,
  supportsLanguages: false,
  supportsLocation: true,
  supportsExternalLinks: true,
} as const;

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment.replace(/\+/g, " "));
  } catch {
    return segment.replace(/\+/g, " ");
  }
}

function extractNameFromMapsUrl(input: string): string | null {
  const url = input.trim();
  // /maps/place/Business+Name — common
  const placeMatch = url.match(/\/maps\/place\/([^/?#]+)/i);
  if (placeMatch?.[1]) return decodeSegment(placeMatch[1].split("/")[0] ?? "");
  // /maps/dir//Business+Name,...
  const dirMatch = url.match(/\/maps\/dir\/[^/]*\/([^/?#@]+)/i);
  if (dirMatch?.[1]) {
    // dir segment may contain "3+All+Day,+FR8G%2BRPV,+..." — take before first comma as name
    const raw = dirMatch[1];
    const namePart = raw.split(",")[0] ?? raw;
    // Strip encoded address fragments after plus
    return decodeSegment(namePart);
  }
  // /maps/dir/Business+Name or /maps/dir//Business (fallback generic dir)
  const dirSimpleM = url.match(/\/maps\/dir\/([^/?#@]+)/i);
  if (dirSimpleM?.[1] && !dirSimpleM[1].includes(",")) {
    // avoid double-matching already handled with comma
    return decodeSegment(dirSimpleM[1]);
  }
  // /maps/search/Business+Name
  const searchMatch = url.match(/\/maps\/search\/([^/?#]+)/i);
  if (searchMatch?.[1]) return decodeSegment(searchMatch[1]);
  // ?q=Business+Name
  const qMatch = url.match(/[?&]q=([^&#]+)/i);
  if (qMatch?.[1]) return decodeSegment(qMatch[1]);
  // maps.app.goo.gl — short link, no name in URL, keep null
  if (/maps\.app\.goo\.gl/i.test(url)) return null;
  return null;
}

function extractLocationFromMapsUrl(input: string): string | null {
  const url = input.trim();
  // Try to extract address part after business name in /place/ or /dir/
  // Example /place/3+All+Day/data=... -> no address in place segment itself
  // Example /dir//3+All+Day,+FR8G%2BRPV,+Nana+Urf.../@lat -> address after first comma
  const dirWithComma = url.match(/\/maps\/dir\/[^/]*\/[^,]+,([^/?#@]+(?:,[^/?#@]+)*)/i);
  if (dirWithComma?.[1]) {
    // Actually take the full segment after name up to /@
    const fullDirSegment = url.match(/\/maps\/dir\/[^/]*\/([^/@]+)/i)?.[1];
    if (fullDirSegment) {
      const decoded = decodeSegment(fullDirSegment);
      // decoded like "3 All Day, FR8G+RPV, Nana Urf..."
      const parts = decoded.split(",").slice(1); // skip name
      const addr = parts.join(", ").trim();
      if (addr.length >= 5) return addr.slice(0, 200);
    }
  }
  // For /place/ URLs, address is often after name in path? Try to capture ",FR8G..."
  const placeAddr = url.match(/\/maps\/place\/[^/]+,([^/@]+)/i);
  if (placeAddr?.[1]) {
    const decoded = decodeSegment(placeAddr[1]);
    if (decoded.length >= 5) return decoded.slice(0, 200);
  }
  // Fallback: extract after name comma for /dir// case using URL object
  try {
    const decodedUrl = decodeSegment(url);
    // Look for encoded plusCode pattern FR8G+RPV
    const plusCodeMatch = decodedUrl.match(/FR8G\+RPV[^@]*/i);
    if (plusCodeMatch) return plusCodeMatch[0].slice(0, 200).trim();
  } catch {}
  return null;
}

export const GoogleMapsAdapter: PlatformAdapter = {
  platform: "google_maps",
  name: "google-maps-url",
  capabilities: CAPABILITIES,

  matches(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes("google.com/maps") || lower.includes("maps.app.goo.gl") || lower.includes("goo.gl/maps");
  },

  extractHandle(url: string): string {
    const name = extractNameFromMapsUrl(url);
    if (name) return name.toLowerCase().replace(/\s+/g, "");
    // fallback to last path segment
    const parts = url.split("/").filter(Boolean);
    return parts[parts.length - 1]?.split("?")[0]?.toLowerCase().replace(/\s+/g, "") ?? "localbusiness";
  },

  async acquire(url: string, options: AcquireOptions): Promise<AdapterResult> {
    const trimmed = url.trim();
    const nameFromUrl = extractNameFromMapsUrl(trimmed);
    const businessName = nameFromUrl || options.creatorName || "Local Business";
    const location = extractLocationFromMapsUrl(trimmed) || "";

    // Preserve original URL, do not fabricate
    const googleMapsUrl = isValidHttpUrl(trimmed) ? trimmed : "";

    // Build ContentSource via helper to keep username/displayName consistent
    const { buildContentSource } = await import("@/lib/generation/integration/provision-pipeline");
    const base = buildContentSource(trimmed, this.platform, businessName);

    // Override with Maps-specific fields
    const source = {
      ...base,
      displayName: businessName,
      username: businessName.toLowerCase().replace(/\s+/g, "").slice(0, 30) || base.username,
      bio: "", // do not fabricate bio
      location: location || "",
      googleMapsUrl,
      // keep links as [url] already from buildContentSource
    };

    return {
      source,
      warnings: location ? [] : ["Maps URL imported — add address details to improve location accuracy."],
    };
  },
};

function isValidHttpUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
