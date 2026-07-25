import type { VisitorStats } from "./types";

export type VisitorProvider = "posthog" | "plausible" | "ga4" | "self-hosted";

export interface VisitorFilter {
  from: Date;
  to: Date;
  timezone?: string;
  path?: string;
  source?: string;
  country?: string;
}

export interface VisitorAnalyticsAdapter {
  readonly provider: VisitorProvider;

  getVisitors(filter: VisitorFilter): Promise<VisitorStats>;

  getPageViews(filter: VisitorFilter): Promise<{ path: string; views: number; unique: number }[]>;

  getSources(filter: VisitorFilter): Promise<{ source: string; visitors: number; percentage: number }[]>;

  getTopPages(filter: VisitorFilter, limit?: number): Promise<{ path: string; title: string; views: number }[]>;

  isConnected(): Promise<boolean>;
}

export type VisitorAnalyticsConfig = PostHogConfig | PlausibleConfig | GA4Config | SelfHostedConfig;

export interface PostHogConfig {
  provider: "posthog";
  apiKey: string;
  projectId: string;
  host?: string;
}

export interface PlausibleConfig {
  provider: "plausible";
  domain: string;
  apiKey: string;
  siteId: string;
  host?: string;
}

export interface GA4Config {
  provider: "ga4";
  propertyId: string;
  credentials: Record<string, unknown>;
}

export interface SelfHostedConfig {
  provider: "self-hosted";
  endpoint: string;
  token?: string;
}

export function createVisitorAdapter(config: VisitorAnalyticsConfig): VisitorAnalyticsAdapter {
  switch (config.provider) {
    case "posthog":
      return new PostHogAdapter(config);
    case "plausible":
      return new PlausibleAdapter(config);
    case "ga4":
      return new GA4Adapter(config);
    case "self-hosted":
      return new SelfHostedAdapter(config);
  }
}

const EMPTY_VISITORS: VisitorStats = { total: 0, unique: 0, returning: 0, byDevice: [], byCountry: [], bySource: [] };

function noopFilter(_filter: VisitorFilter): void {
  void _filter;
}

function noopLimit(_limit?: number): void {
  void _limit;
}

class PostHogAdapter implements VisitorAnalyticsAdapter {
  readonly provider: VisitorProvider = "posthog";
  constructor(private config: PostHogConfig) {}

  async getVisitors(filter: VisitorFilter): Promise<VisitorStats> { noopFilter(filter); return EMPTY_VISITORS; }
  async getPageViews(filter: VisitorFilter): Promise<{ path: string; views: number; unique: number }[]> { noopFilter(filter); return []; }
  async getSources(filter: VisitorFilter): Promise<{ source: string; visitors: number; percentage: number }[]> { noopFilter(filter); return []; }
  async getTopPages(filter: VisitorFilter, limit?: number): Promise<{ path: string; title: string; views: number }[]> { noopFilter(filter); noopLimit(limit); return []; }
  async isConnected(): Promise<boolean> { return !!this.config.apiKey; }
}

class PlausibleAdapter implements VisitorAnalyticsAdapter {
  readonly provider: VisitorProvider = "plausible";
  constructor(private config: PlausibleConfig) {}

  async getVisitors(filter: VisitorFilter): Promise<VisitorStats> { noopFilter(filter); return EMPTY_VISITORS; }
  async getPageViews(filter: VisitorFilter): Promise<{ path: string; views: number; unique: number }[]> { noopFilter(filter); return []; }
  async getSources(filter: VisitorFilter): Promise<{ source: string; visitors: number; percentage: number }[]> { noopFilter(filter); return []; }
  async getTopPages(filter: VisitorFilter, limit?: number): Promise<{ path: string; title: string; views: number }[]> { noopFilter(filter); noopLimit(limit); return []; }
  async isConnected(): Promise<boolean> { return !!this.config.apiKey; }
}

class GA4Adapter implements VisitorAnalyticsAdapter {
  readonly provider: VisitorProvider = "ga4";
  constructor(private config: GA4Config) {}

  async getVisitors(filter: VisitorFilter): Promise<VisitorStats> { noopFilter(filter); return EMPTY_VISITORS; }
  async getPageViews(filter: VisitorFilter): Promise<{ path: string; views: number; unique: number }[]> { noopFilter(filter); return []; }
  async getSources(filter: VisitorFilter): Promise<{ source: string; visitors: number; percentage: number }[]> { noopFilter(filter); return []; }
  async getTopPages(filter: VisitorFilter, limit?: number): Promise<{ path: string; title: string; views: number }[]> { noopFilter(filter); noopLimit(limit); return []; }
  async isConnected(): Promise<boolean> { return !!this.config.propertyId; }
}

class SelfHostedAdapter implements VisitorAnalyticsAdapter {
  readonly provider: VisitorProvider = "self-hosted";
  constructor(private config: SelfHostedConfig) {}

  async getVisitors(filter: VisitorFilter): Promise<VisitorStats> { noopFilter(filter); return EMPTY_VISITORS; }
  async getPageViews(filter: VisitorFilter): Promise<{ path: string; views: number; unique: number }[]> { noopFilter(filter); return []; }
  async getSources(filter: VisitorFilter): Promise<{ source: string; visitors: number; percentage: number }[]> { noopFilter(filter); return []; }
  async getTopPages(filter: VisitorFilter, limit?: number): Promise<{ path: string; title: string; views: number }[]> { noopFilter(filter); noopLimit(limit); return []; }
  async isConnected(): Promise<boolean> { return !!this.config.endpoint; }
}
