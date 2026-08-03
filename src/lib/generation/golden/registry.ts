import type { GoldenCreatorEntry, GoldenDatasetConfig } from "./types";

const GOLDEN_CREATORS: GoldenCreatorEntry[] = [
  {
    id: "golden-gaming-001",
    name: "Wiffey Gamer",
    platform: "youtube",
    url: "https://www.youtube.com/@Wiffeygamer_8",
    expectedPersonaId: "persona-gaming-streamer",
    expectedPersonaName: "Gaming Streamer",
    expectedBusinessModel: "community",
    expectedCreatorStage: "growing",
    expectedContentStyle: "entertainment",
    expectedAudienceType: "niche",
    expectedBrandStrength: "moderate",
    expectedCommerceStage: "exploring",
    expectedConfidence: 0.82,
    tags: ["gaming", "entertainment", "live-streaming"],
  },
  {
    id: "golden-education-001",
    name: "Class 9 Maths & Science",
    platform: "youtube",
    url: "https://www.youtube.com/@Class9MathsScience",
    expectedPersonaId: "persona-educator",
    expectedPersonaName: "Educator",
    expectedBusinessModel: "education",
    expectedCreatorStage: "growing",
    expectedContentStyle: "educational",
    expectedAudienceType: "professional",
    expectedBrandStrength: "moderate",
    expectedCommerceStage: "none",
    expectedConfidence: 0.91,
    tags: ["education", "math", "science"],
  },
  {
    id: "golden-entertainment-001",
    name: "Farah Khan",
    platform: "youtube",
    url: "https://www.youtube.com/@FarahKhanK",
    expectedPersonaId: "persona-lifestyle-creator",
    expectedPersonaName: "Lifestyle Creator",
    expectedBusinessModel: "hybrid",
    expectedCreatorStage: "established",
    expectedContentStyle: "entertainment",
    expectedAudienceType: "general",
    expectedBrandStrength: "strong",
    expectedCommerceStage: "growing",
    expectedConfidence: 0.85,
    tags: ["entertainment", "lifestyle", "vlogging"],
  },
  {
    id: "golden-comedy-001",
    name: "Samay Raina",
    platform: "youtube",
    url: "https://www.youtube.com/@SamayRainaOfficial",
    expectedPersonaId: "persona-entertainer",
    expectedPersonaName: "Entertainer",
    expectedBusinessModel: "hybrid",
    expectedCreatorStage: "established",
    expectedContentStyle: "entertainment",
    expectedAudienceType: "general",
    expectedBrandStrength: "strong",
    expectedCommerceStage: "growing",
    expectedConfidence: 0.88,
    tags: ["comedy", "entertainment", "standup"],
  },
  // IMPLEMENTATION-32 — expanded regression dataset (representative anchors).
  {
    id: "golden-athlete-001",
    name: "Cristiano Ronaldo",
    platform: "instagram",
    url: "https://www.instagram.com/cristiano",
    expectedPersonaId: "sports_athlete",
    expectedPersonaName: "Athlete",
    expectedBusinessModel: "hybrid",
    expectedCreatorStage: "celebrity",
    expectedContentStyle: "inspirational",
    expectedAudienceType: "niche",
    expectedBrandStrength: "moderate",
    expectedCommerceStage: "growing",
    expectedConfidence: 0.95,
    expectedEntityType: "athlete",
    expectedPrimaryNiche: "sports",
    tags: ["athlete", "sports", "celebrity"],
  },
  {
    id: "golden-entertainment-002",
    name: "MrBeast",
    platform: "youtube",
    url: "https://www.youtube.com/@MrBeast",
    expectedPersonaId: "finance_educator",
    expectedPersonaName: "Finance Educator",
    expectedBusinessModel: "hybrid",
    expectedCreatorStage: "celebrity",
    expectedContentStyle: "educational",
    expectedAudienceType: "niche",
    expectedBrandStrength: "moderate",
    expectedCommerceStage: "growing",
    expectedConfidence: 0.6,
    expectedEntityType: "creator",
    expectedPrimaryNiche: "entertainment",
    tags: ["entertainment", "creator", "celebrity"],
  },
  {
    id: "golden-technology-001",
    name: "Fireship",
    platform: "youtube",
    url: "https://www.youtube.com/@Fireship",
    expectedPersonaId: "tech_developer",
    expectedPersonaName: "Developer",
    expectedBusinessModel: "hybrid",
    expectedCreatorStage: "celebrity",
    expectedContentStyle: "technical",
    expectedAudienceType: "niche",
    expectedBrandStrength: "moderate",
    expectedCommerceStage: "growing",
    expectedConfidence: 0.85,
    expectedEntityType: "developer",
    expectedPrimaryNiche: "technology",
    tags: ["technology", "developer", "education"],
  },
  {
    id: "golden-brand-001",
    name: "Nike",
    platform: "youtube",
    url: "https://www.youtube.com/@nike",
    expectedPersonaId: "default_creator",
    expectedPersonaName: "Creator",
    expectedBusinessModel: "direct_sales",
    expectedCreatorStage: "celebrity",
    expectedContentStyle: "promotional",
    expectedAudienceType: "professional",
    expectedBrandStrength: "strong",
    expectedCommerceStage: "scaling",
    expectedConfidence: 0.6,
    expectedEntityType: "brand",
    expectedPrimaryNiche: "sports",
    tags: ["brand", "sports", "retail"],
  },
  {
    id: "golden-brand-002",
    name: "Apple",
    platform: "youtube",
    url: "https://www.youtube.com/@Apple",
    expectedPersonaId: "default_creator",
    expectedPersonaName: "Creator",
    expectedBusinessModel: "direct_sales",
    expectedCreatorStage: "celebrity",
    expectedContentStyle: "promotional",
    expectedAudienceType: "professional",
    expectedBrandStrength: "strong",
    expectedCommerceStage: "scaling",
    expectedConfidence: 0.6,
    expectedEntityType: "brand",
    expectedPrimaryNiche: "technology",
    tags: ["brand", "technology", "retail"],
  },
  {
    id: "golden-education-002",
    name: "Khan Academy",
    platform: "youtube",
    url: "https://www.youtube.com/@khanacademy",
    expectedPersonaId: "education_course_creator",
    expectedPersonaName: "Course Creator",
    expectedBusinessModel: "hybrid",
    expectedCreatorStage: "celebrity",
    expectedContentStyle: "educational",
    expectedAudienceType: "niche",
    expectedBrandStrength: "moderate",
    expectedCommerceStage: "growing",
    expectedConfidence: 0.85,
    expectedEntityType: "educator",
    expectedPrimaryNiche: "education",
    tags: ["education", "learning"],
  },
  {
    id: "golden-restaurant-001",
    name: "SeaShell Restaurant",
    platform: "instagram",
    url: "https://www.instagram.com/seashell",
    expectedPersonaId: "food_restaurant",
    expectedPersonaName: "Restaurant",
    expectedBusinessModel: "direct_sales",
    expectedCreatorStage: "established",
    expectedContentStyle: "promotional",
    expectedAudienceType: "niche",
    expectedBrandStrength: "moderate",
    expectedCommerceStage: "growing",
    expectedConfidence: 0.95,
    expectedEntityType: "restaurant",
    expectedPrimaryNiche: "food",
    tags: ["restaurant", "food", "local"],
  },
  {
    id: "golden-photographer-001",
    name: "Jane Photography",
    platform: "instagram",
    url: "https://www.instagram.com/jane.shoots",
    expectedPersonaId: "photography_print_seller",
    expectedPersonaName: "Print Seller",
    expectedBusinessModel: "direct_sales",
    expectedCreatorStage: "professional",
    expectedContentStyle: "inspirational",
    expectedAudienceType: "niche",
    expectedBrandStrength: "moderate",
    expectedCommerceStage: "growing",
    expectedConfidence: 0.95,
    expectedEntityType: "creator",
    expectedPrimaryNiche: "photography",
    tags: ["photography", "creator"],
  },
  {
    id: "golden-coach-001",
    name: "Fit Coach Alex",
    platform: "instagram",
    url: "https://www.instagram.com/fitcoach",
    expectedPersonaId: "fitness_gym",
    expectedPersonaName: "Gym",
    expectedBusinessModel: "direct_sales",
    expectedCreatorStage: "established",
    expectedContentStyle: "promotional",
    expectedAudienceType: "niche",
    expectedBrandStrength: "moderate",
    expectedCommerceStage: "growing",
    expectedConfidence: 0.85,
    expectedEntityType: "coach",
    expectedPrimaryNiche: "fitness",
    tags: ["coach", "fitness", "services"],
  },
  {
    id: "golden-agency-001",
    name: "Creatosa Agency",
    platform: "instagram",
    url: "https://www.instagram.com/creatosa",
    expectedPersonaId: "default_creator",
    expectedPersonaName: "Creator",
    expectedBusinessModel: "hybrid",
    expectedCreatorStage: "established",
    expectedContentStyle: "entertainment",
    expectedAudienceType: "professional",
    expectedBrandStrength: "moderate",
    expectedCommerceStage: "growing",
    expectedConfidence: 0.45,
    expectedEntityType: "agency",
    expectedPrimaryNiche: "business",
    tags: ["agency", "business", "services"],
  },
];

export class GoldenDataset {
  private creators: Map<string, GoldenCreatorEntry> = new Map();

  constructor(config?: Partial<GoldenDatasetConfig>) {
    this.config = {
      enabled: true,
      strictMode: false,
      scoreThreshold: 0.7,
      ...config,
    };
    for (const creator of GOLDEN_CREATORS) {
      this.creators.set(creator.id, creator);
    }
  }

  readonly config: GoldenDatasetConfig;

  getCreator(id: string): GoldenCreatorEntry | undefined {
    return this.creators.get(id);
  }

  findByUrl(url: string): GoldenCreatorEntry | undefined {
    const normalized = url.toLowerCase().replace(/\/+$/, "");
    const all = Array.from(this.creators, ([_, v]) => v);
    for (const creator of all) {
      if (creator.url.toLowerCase().replace(/\/+$/, "") === normalized) {
        return creator;
      }
    }
    return undefined;
  }

  findByPlatform(platform: string): GoldenCreatorEntry[] {
    return Array.from(this.creators, ([_, v]) => v).filter(
      (c) => c.platform === platform,
    );
  }

  findByTag(tag: string): GoldenCreatorEntry[] {
    return Array.from(this.creators, ([_, v]) => v).filter((c) =>
      c.tags.includes(tag),
    );
  }

  listAll(): GoldenCreatorEntry[] {
    return Array.from(this.creators, ([_, v]) => v);
  }

  register(entry: GoldenCreatorEntry): void {
    this.creators.set(entry.id, entry);
  }

  isKnownUrl(url: string): boolean {
    return this.findByUrl(url) !== undefined;
  }
}

export const goldenDataset = new GoldenDataset();
