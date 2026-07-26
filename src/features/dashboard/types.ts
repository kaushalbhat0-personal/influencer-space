export interface DashboardMetrics {
  productCount: number;
  activeProductCount: number;
  orderCount: number;
  revenue: number;
  galleryCount: number;
  linkCount: number;
  messageCount: number;
  publishedVersion: number | null;
  generationStatus: string | null;
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
  done: boolean;
  href: string;
  estimatedMinutes: number;
}
