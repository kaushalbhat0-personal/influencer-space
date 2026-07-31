export interface DashboardMetrics {
  productCount: number;
  activeProductCount: number;
  publishedProductCount: number;
  orderCount: number;
  revenue: number;
  galleryCount: number;
  linkCount: number;
  messageCount: number;
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
}

export interface DashboardActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
}

export interface DashboardHealthCheck {
  label: string;
  score: number;
  done: boolean;
  href: string;
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
