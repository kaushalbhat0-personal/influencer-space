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
  name: "Raj 'Snax' Varma",
  tagline: "S8UL Esports | BGMI Pro | Content Creator",
  bio: "Hyderabadi energy — loud, warm, and welcoming. From the streets of Hyderabad to representing India at the Esports World Cup in Riyadh. S8UL content creator, BGMI pro, and your favorite gaming uncle. I keep it real, keep it Hyderabadi, and keep the squad entertained. Assaulting drills, funny commentary, and pure vibes — that's the Snax show. When I joined S8UL, the global recognition at the Esports Awards truly motivated me. The love I get from Hyderabad and across India means everything; it's an honour to represent my roots.",
  social: {
    instagram: "https://instagram.com/snaxgaming",
    youtube: "https://youtube.com/@SnaxGaming",
    twitter: "https://twitter.com/statu..",
    tiktok: "",
  },
  profileImage:
    "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=400&fit=crop",
  niche: "gaming",
  colors: {
    primary: "#2D1B69",
    secondary: "#00f5ff",
    accent: "#ff00e5",
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
