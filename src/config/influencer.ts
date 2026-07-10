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
  name: "Sapna Khanna",
  tagline: "Ms. Fitness India 2018 | Fat Loss & Hormonal Health Coach",
  bio: "I help women rebuild their strength—physically and emotionally. From navigating two C-section pregnancies to single parenting and personal loss, training has been my constant. I specialize in fat loss, metabolism correction, hormonal balance (thyroid & PCOD), and postpartum recovery. No quick fixes. Just real, sustainable results. Because you deserve to be the fittest version of yourself.",
  social: {
    instagram: "https://instagram.com/sapnakhannafitness",
    youtube: "",
    twitter: "",
    tiktok: "",
  },
  profileImage:
    "https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400&h=400&fit=crop",
  niche: "fitness",
  colors: {
    primary: "#d4a843",
    secondary: "#fbbf24",
    accent: "#b45309",
  },
};

let cachedConfig: InfluencerDataType | null = null;

export async function getInfluencerConfig(): Promise<InfluencerDataType> {
  if (cachedConfig) return cachedConfig;
  try {
    const { SettingsService } = await import("@/services/settings.service");
    const data = await SettingsService.getInfluencerData();
    cachedConfig = data;
    return data;
  } catch {
    return defaultConfig;
  }
}

export function invalidateConfigCache() {
  cachedConfig = null;
}

export const influencerConfig = defaultConfig;
