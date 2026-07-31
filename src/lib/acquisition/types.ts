import type { LucideIcon } from "lucide-react";

export type AcquisitionStrategy = "youtube" | "manual" | "demo_seed" | "instagram" | "twitch" | "website" | "tiktok" | "google_business" | "unknown";

/**
 * @deprecated Use BusinessProfile from @/lib/acquisition/business-types instead.
 * CreatorProfile is legacy — kept for backward compatibility during migration.
 * Will be removed after all adapters are migrated to BusinessProfile.
 */
export interface CreatorProfile {
  creatorName: string;
  brandName: string;
  tagline: string;
  bio: string;
  heroTitle: string;
  aboutText: string;
  tone: string;
  niche: string;
  audience: string;
  products: { name: string; price: number; description: string }[];
  services: string[];
  socialLinks: { platform: string; url: string }[];
  seoTitle: string;
  seoDesc: string;
  palette: { primary: string; secondary: string };
  logoUrl?: string;
  faq: { q: string; a: string }[];
  testimonials: { name: string; text: string }[];
  pages: string[];
}

import type { BusinessProfile } from "./business-types";

export interface AcquisitionResult {
  /** The acquired business data. Canonical — use for provisioning. */
  profile: BusinessProfile;
  /**
   * @deprecated Legacy compatibility — use profile fields directly.
   * Maps to profile.businessName, profile.description, etc.
   */
  strategy: AcquisitionStrategy;
  rawInput: string;
  confidence: number;
  completeness: number;
  warnings: string[];
  requiresManualReview: boolean;
  assets?: {
    avatarUrl?: string;
    bannerUrl?: string;
    logoUrl?: string;
  };
  providerMetadata?: Record<string, unknown>;
}

export interface CreatorAcquisitionAdapter {
  id: AcquisitionStrategy;
  label: string;
  description: string;
  icon?: LucideIcon;
  requiresManualReview: boolean;
  typicalConfidence: number;
  validate(input: string): { valid: boolean; error?: string };
  acquire(input: string): Promise<AcquisitionResult>;
}

export interface AcquisitionRecord {
  id: string;
  strategy: AcquisitionStrategy;
  input: string;
  creatorName: string;
  tenantId: string;
  storefrontUrl: string;
  status: "started" | "completed" | "failed";
  confidence: number;
  completeness: number;
  warnings: string[];
  duration: number;
  errors: string[];
  createdAt: string;
}

export interface AcquisitionProvisionResult {
  success: boolean;
  tenantId: string;
  storefrontUrl: string;
  status: "published" | "failed";
  record: AcquisitionRecord;
  error?: string;
}
