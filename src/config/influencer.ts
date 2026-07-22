export type InfluencerDataType = {
  name: string;
  tagline: string;
  bio: string;
  social: {
    instagram: string;
    youtube: string;
    twitter: string;
    tiktok: string;
  };
  profileImage: string | null;
  niche: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
};

export const defaultConfig: InfluencerDataType = {
  name: "Creator",
  tagline: "Welcome to my creator storefront",
  bio: "Creator on CreatorStore.",
  social: {
    instagram: "",
    youtube: "",
    twitter: "",
    tiktok: "",
  },
  profileImage: null,
  niche: "general",
  colors: {
    primary: "#2D1B69",
    secondary: "#00f5ff",
    accent: "#ff00e5",
  },
};

export async function getInfluencerConfig(): Promise<InfluencerDataType> {
  try {
    const { getTenantContext } = await import("@/lib/tenant");
    const tenant = await getTenantContext();
    if (!tenant) return defaultConfig;

    const { SettingsService } = await import("@/services/settings.service");
    const data = await SettingsService.getInfluencerData(tenant.id);
    return data;
  } catch {
    return defaultConfig;
  }
}

export const influencerConfig = defaultConfig;
