export type Niche =
  | "gaming" | "fitness" | "education" | "music"
  | "restaurant" | "technology" | "fashion" | "art"
  | "photography" | "travel" | "lifestyle" | "business"
  | "entertainment" | "sports" | "health" | "general";

const NICHE_KEYWORDS: Record<Niche, string[]> = {
  gaming: ["gaming", "game", "streamer", "twitch", "esports", "pro", "plays", "yt", "gameplay", "pubg", "bgmi", "free fire", "valorant", "fortnite", "minecraft"],
  fitness: ["fitness", "gym", "workout", "health", "wellness", "yoga", "trainer", "coach", "bodybuilding", "nutrition", "diet", "exercise"],
  education: ["education", "learn", "teach", "course", "tutorial", "academy", "school", "training", "lecture", "professor", "teacher", "knowledge"],
  music: ["music", "song", "singer", "rapper", "band", "artist", "beat", "producer", "dj", "musician", "vocal", "melody", "album"],
  restaurant: ["food", "chef", "cook", "recipe", "kitchen", "restaurant", "baking", "cuisine", "tasty", "delicious", "cooking", "meal"],
  technology: ["tech", "technology", "coding", "programming", "developer", "software", "ai", "startup", "gadget", "review", "unboxing", "digital"],
  fashion: ["fashion", "style", "beauty", "makeup", "skincare", "outfit", "trend", "model", "wardrobe", "cosmetic", "accessory"],
  art: ["art", "artist", "painting", "draw", "sketch", "illustration", "creative", "design", "craft", "diy", "handmade", "creative"],
  photography: ["photo", "photography", "photographer", "camera", "lens", "capture", "portrait", "landscape", "edit", "lightroom"],
  travel: ["travel", "trip", "journey", "adventure", "explore", "wander", "tourist", "backpack", "vacation", "destination", "roam"],
  lifestyle: ["lifestyle", "vlog", "daily", "life", "routine", "family", "mom", "dad", "parent", "home", "living"],
  business: ["business", "entrepreneur", "startup", "marketing", "sales", "consult", "agency", "brand", "finance", "investment", "money"],
  entertainment: ["entertainment", "comedy", "funny", "skit", "comic", "humor", "prank", "reaction", "drama", "show", "celebrity"],
  sports: ["sports", "sport", "athlete", "cricket", "football", "soccer", "basketball", "fitness", "training", "outdoor", "competition"],
  health: ["health", "mental", "wellness", "therapy", "healing", "holistic", "meditation", "mindfulness", "selfcare", "recovery"],
  general: [],
};

export class NicheDetector {
  detect(name: string): Niche {
    const lower = name.toLowerCase();

    // Score each niche
    let best: Niche = "general";
    let bestScore = 0;

    for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        if (lower.includes(kw)) score += kw.length;
        if (lower.startsWith(kw)) score += 3;
        if (lower.endsWith(kw)) score += 2;
      }
      if (score > bestScore) {
        bestScore = score;
        best = niche as Niche;
      }
    }

    return best;
  }

  detectFromUrl(url: string): Niche {
    const lower = url.toLowerCase();
    if (lower.includes("youtube.com/") || lower.includes("youtu.be/")) {
      // Extract handle from YouTube URL
      const match = lower.match(/@([a-z0-9_-]+)/) || lower.match(/channel\/([a-z0-9_-]+)/) || lower.match(/c\/([a-z0-9_-]+)/);
      if (match) return this.detect(match[1]);
    }
    // Extract the last path segment as a fallback name
    const segments = url.replace(/https?:\/\//, "").split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";
    return this.detect(lastSegment.replace(/[@_-]/g, " "));
  }
}

export const nicheDetector = new NicheDetector();
