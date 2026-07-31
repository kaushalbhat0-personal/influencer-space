import type { CreatorAcquisitionAdapter, AcquisitionResult } from "@/lib/acquisition/types";
import type { BusinessProfile } from "@/lib/acquisition/business-types";
import { inferCategory } from "@/lib/acquisition/classify";
import { Store } from "lucide-react";

/**
 * Google Business / Maps acquisition — architecture-only for now.
 *
 * No Google Places API dependency. Extracts whatever is available from the
 * input (a Google Maps URL or a business name) and normalizes it into a
 * BusinessProfile. Fields that require the Places API (address, hours,
 * phone, rating, website, photos) are surfaced as empty + a warning so the
 * creator can fill them, and the maps URL is kept in `providerMetadata` for
 * a future API-backed enrichment step.
 */

function looksLikeUrl(input: string): boolean {
  return /^(https?:\/\/)?(www\.)?(maps\.google|google\.com\/maps|goo\.gl)/i.test(input.trim());
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment.replace(/\+/g, " "));
  } catch {
    return segment.replace(/\+/g, " ");
  }
}

function extractNameFromMapsUrl(input: string): string | null {
  const url = input.trim();
  // https://maps.google.com/maps/place/Business+Name/@lat,lng,...
  const placeMatch = url.match(/\/maps\/place\/([^/]+)/i);
  if (placeMatch?.[1]) return decodeSegment(placeMatch[1]);
  // ?q=Business+Name
  const qMatch = url.match(/[?&]q=([^&#]+)/i);
  if (qMatch?.[1]) return decodeSegment(qMatch[1]);
  // /maps/search/Business+Name
  const searchMatch = url.match(/\/maps\/search\/([^/]+)/i);
  if (searchMatch?.[1]) return decodeSegment(searchMatch[1]);
  return null;
}

export class GoogleBusinessAcquisitionAdapter implements CreatorAcquisitionAdapter {
  id = "google_business" as const;
  label = "Google Business";
  description = "Import from a Google Maps URL or business name";
  icon = Store;
  requiresManualReview = true;
  typicalConfidence = 40;

  validate(input: string): { valid: boolean; error?: string } {
    const trimmed = input.trim();
    if (!trimmed) return { valid: false, error: "A Google Maps URL or business name is required." };
    if (!looksLikeUrl(trimmed) && trimmed.length < 2) {
      return { valid: false, error: "Business name must be at least 2 characters." };
    }
    return { valid: true };
  }

  async acquire(input: string): Promise<AcquisitionResult> {
    const trimmed = input.trim();
    const isUrl = looksLikeUrl(trimmed);
    const nameFromUrl = isUrl ? extractNameFromMapsUrl(trimmed) : null;
    const businessName = nameFromUrl || (isUrl ? trimmed : trimmed);
    const { category, industry } = inferCategory(businessName);

    const warnings: string[] = [];
    if (isUrl) {
      warnings.push("Google Maps URL imported. Address, hours, phone and rating require the Places API — add them manually for now.");
    } else {
      warnings.push("Business name imported. Add your address, hours, phone and website to make the profile complete.");
    }

    return {
      strategy: "google_business",
      rawInput: input,
      confidence: nameFromUrl ? 45 : 30,
      completeness: 25,
      warnings,
      requiresManualReview: true,
      providerMetadata: {
        mapsUrl: isUrl ? trimmed : null,
        sourceType: isUrl ? "maps_url" : "business_name",
        apiReady: true,
        extractedFields: isUrl ? ["name"] : [],
      },
      profile: {
        businessName,
        ownerName: businessName,
        category,
        industry,
        tagline: "",
        description: "",
        audience: "",
        goals: "",
        tone: "professional",
        offers: [],
        socialLinks: [],
        palette: { primary: "#6366f1", secondary: "#a78bfa" },
        pages: ["home", "about", "contact"],
      } as BusinessProfile,
    };
  }
}
