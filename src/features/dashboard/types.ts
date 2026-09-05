export interface DashboardMetrics {
  productCount: number;
  activeProductCount: number;
  publishedProductCount: number;
  orderCount: number;
  revenue: number;
  galleryCount: number;
  linkCount: number;
  messageCount: number;
  bookingCount: number;
  offeringCount: number;
  totalOrders: number;
  publishedVersion: number | null;
  publishedAt: string | null;
  generationStatus: string | null;
  publishState: string | null;
  storefrontUrl: string;
  hasPublishedSnapshot: boolean;
  hasCustomDomain: boolean;
  hasSeo: boolean;
  profileCompletion: number;
  testimonialCount: number;
  currentTheme: string | null;
  recentVersions: Array<{ version: number; createdAt: string }>;
  /** Creator Success Runtime data for guided onboarding */
  creatorSuccess?: import("@/lib/creator-success/runtime").CreatorSuccessData;
  /** Creator brand polish (05E) — restrained accent using existing appearance data */
  brandColor?: string | null;
  profileAvatarUrl?: string | null;
  coverUrl?: string | null;
  heroName?: string | null;
}

export interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
}

export interface QuickStartStep {
  id: string;
  label: string;
  description?: string;
  done: boolean;
  href: string;
  estimatedMinutes: number;
}

export interface QuickCard {
  label: string;
  value: string | number;
  href: string;
  icon: string;
  color: string;
}
