/**
 * Dashboard DTOs v1.0.0
 *
 * UI-friendly data transfer objects for the dashboard overview.
 * Aggregate statistics across multiple platform modules.
 */

export interface DashboardStatsDTO {
  productCount: number;
  activeProductCount: number;
  affiliateCount: number;
  totalClicks: number;
  galleryCount: number;
  gamesCount: number;
}

export interface DashboardQuickActionDTO {
  label: string;
  href: string;
  icon: string;
  color: string;
  description: string;
}
