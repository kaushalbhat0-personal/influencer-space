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
