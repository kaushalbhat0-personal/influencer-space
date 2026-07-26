export interface SmokeCreator {
  id: string;
  niche: string;
  creatorName: string;
  youtubeUrl: string;
  slug: string;
  screenshotDir: string;
}

export const SMOKE_CREATORS: readonly SmokeCreator[] = Object.freeze([
  {
    id: "smoke-gaming-001", niche: "gaming",
    creatorName: "Wiffey Gamer",
    youtubeUrl: "https://www.youtube.com/@Wiffeygamer_8",
    slug: "wiffey-gamer",
    screenshotDir: "docs/alpha/screenshots/gaming/wiffey-gamer",
  },
  {
    id: "smoke-education-001", niche: "education",
    creatorName: "Class 9 Maths & Science",
    youtubeUrl: "https://www.youtube.com/@Class9MathsScience",
    slug: "class9-maths-science",
    screenshotDir: "docs/alpha/screenshots/education/class9-maths-science",
  },
  {
    id: "smoke-finance-001", niche: "finance",
    creatorName: "CA Rachana Ranade",
    youtubeUrl: "https://www.youtube.com/@CARachanaRanade",
    slug: "ca-rachana-ranade",
    screenshotDir: "docs/alpha/screenshots/finance/ca-rachana-ranade",
  },
  {
    id: "smoke-tech-001", niche: "technology",
    creatorName: "Tech Burner",
    youtubeUrl: "https://www.youtube.com/@TechBurner",
    slug: "tech-burner",
    screenshotDir: "docs/alpha/screenshots/technology/tech-burner",
  },
  {
    id: "smoke-photo-001", niche: "photography",
    creatorName: "PiXimperfect",
    youtubeUrl: "https://www.youtube.com/@PiXimperfect",
    slug: "piximperfect",
    screenshotDir: "docs/alpha/screenshots/photography/piximperfect",
  },
  {
    id: "smoke-fitness-001", niche: "fitness",
    creatorName: "Fit Tuber",
    youtubeUrl: "https://www.youtube.com/@FitTuber",
    slug: "fit-tuber",
    screenshotDir: "docs/alpha/screenshots/fitness/fit-tuber",
  },
  {
    id: "smoke-food-001", niche: "food",
    creatorName: "Kabita's Kitchen",
    youtubeUrl: "https://www.youtube.com/@KabitasKitchen",
    slug: "kabitas-kitchen",
    screenshotDir: "docs/alpha/screenshots/food/kabitas-kitchen",
  },
  {
    id: "smoke-travel-001", niche: "travel",
    creatorName: "Visa2Explore",
    youtubeUrl: "https://www.youtube.com/@Visa2Explore",
    slug: "visa2explore",
    screenshotDir: "docs/alpha/screenshots/travel/visa2explore",
  },
  {
    id: "smoke-comedy-001", niche: "comedy",
    creatorName: "Samay Raina",
    youtubeUrl: "https://www.youtube.com/@SamayRainaOfficial",
    slug: "samay-raina",
    screenshotDir: "docs/alpha/screenshots/comedy/samay-raina",
  },
  {
    id: "smoke-celebrity-001", niche: "celebrity",
    creatorName: "Farah Khan",
    youtubeUrl: "https://www.youtube.com/@FarahKhanK",
    slug: "farah-khan",
    screenshotDir: "docs/alpha/screenshots/celebrity/farah-khan",
  },
]);
