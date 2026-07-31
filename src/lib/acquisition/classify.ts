import { NicheDetector } from "@/lib/generation/intelligence/niche-detector";

const detector = new NicheDetector();

export interface CategoryInference {
  category: string;
  industry: string;
}

const INDUSTRY_LABELS: Record<string, string> = {
  gaming: "Gaming",
  education: "Education",
  finance: "Finance",
  fitness: "Fitness & Health",
  music: "Music",
  travel: "Travel",
  food: "Restaurant & Food",
  photography: "Photography",
  technology: "Technology & SaaS",
  art: "Art & Design",
  lifestyle: "Lifestyle",
  sports: "Sports",
  news: "News & Media",
  comedy: "Comedy",
  film: "Film & Entertainment",
  celebrity: "Celebrity",
  business: "Business & Agency",
};

/**
 * Infer a business category + industry label from a name + description using
 * the same weighted taxonomy as the intelligence pipeline. Falls back to
 * "general" so every acquisition strategy produces a non-empty category.
 */
export function inferCategory(name: string, description?: string): CategoryInference {
  const result = detector.detect({
    platform: "manual",
    username: "",
    displayName: name,
    bio: description ?? "",
    avatarUrl: "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: [],
  });

  const category = result.niche === "general" ? "general" : result.niche;
  return {
    category,
    industry: INDUSTRY_LABELS[category] ?? category,
  };
}
