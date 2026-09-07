export type IntegrationStatus =
  | "connected"
  | "configured"
  | "incomplete"
  | "not_connected"
  | "coming_soon";

export interface SocialStatView {
  followers: number;
  views: number;
  posts: number;
  updatedAt: string | null;
}

export interface IntegrationData {
  platform: string;
  name: string;
  description: string;
  connected: boolean;
  status: IntegrationStatus;
  icon: string;
  config: Record<string, string | boolean>;
  scopes: string[];
  stats: SocialStatView | null;
}

export interface IntegrationConfig {
  youtube?: { apiKey?: string; channelId?: string };
  instagram?: { accessToken?: string; accountId?: string };
  googleAnalytics?: { measurementId?: string; apiSecret?: string };
  metaPixel?: { pixelId?: string; accessToken?: string };
}

export interface IntegrationFormInput {
  platform: string;
  config: Record<string, string>;
}
