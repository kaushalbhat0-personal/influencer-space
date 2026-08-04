/**
 * Evidence Intelligence configuration — IMPLEMENTATION-36.
 *
 * Canonical entity / niche / business-model / audience keyword matrices and the
 * recommendation map. Every detection derives from these matrices and records
 * the matched signals as EVIDENCE — conclusions are never unexplained.
 *
 * All config-driven; AI is only used to fill gaps (never to invent).
 */

// ── Entities ────────────────────────────────────────────────────────────────

export const ENTITY_TYPES = [
  "creator", "influencer", "streamer", "athlete", "sports_team", "fitness",
  "coach", "educator", "teacher", "doctor", "lawyer", "consultant",
  "developer", "designer", "artist", "musician", "actor", "photographer",
  "trader", "investor", "restaurant", "startup", "agency", "brand",
  "company", "podcast", "public_figure", "event", "ngo", "government",
  "organization",
] as const;
export type EvidenceEntityType = (typeof ENTITY_TYPES)[number];
export const ENTITY_TYPE_SET: ReadonlySet<string> = new Set(ENTITY_TYPES as readonly string[]);

export interface EntityRule {
  entity: EvidenceEntityType;
  keywords: string[];
  /** Weight bonus for stronger signals (e.g. "fifa" > "football"). */
  strongKeywords?: string[];
  /** Auto-boost when the base niche matches (e.g. athlete ↔ sports). */
  nicheAffinity?: string[];
}

export const ENTITY_RULES: EntityRule[] = [
  { entity: "athlete", keywords: ["athlete", "football", "soccer", "sports", "player", "goal", "striker", "cricket", "basketball", "tennis", "golf", "fitness", "training"], strongKeywords: ["fifa", "uefa", "champions league", "premier league", "real madrid", "nba", "olympic", "world cup", "forward"], nicheAffinity: ["sports"] },
  { entity: "sports_team", keywords: ["football club", "cricket team", "team", "club official"], strongKeywords: ["basketball team", "nba", "epl", "la liga", "club"] },
  { entity: "fitness", keywords: ["fitness", "gym", "workout", "training", "personal trainer", "nutrition", "wellness", "health"], strongKeywords: ["crossfit", "muscle", "diet", "bodybuilding"] },
  { entity: "coach", keywords: ["coach", "coaching", "mentor", "mentorship", "personal training"], strongKeywords: ["1:1", "life coach", "business coach"] },
  { entity: "educator", keywords: ["educator", "tutorial", "course", "curriculum", "lesson", "lecture", "academy", "masterclass", "education"], strongKeywords: ["professor", "teacher", "khan academy"] },
  { entity: "teacher", keywords: ["teacher", "teaching", "classroom", "school", "exam prep"], strongKeywords: ["math teacher", "science teacher"] },
  { entity: "doctor", keywords: ["doctor", "physician", "clinic", "medical", "healthcare", "patient", "dentist", "surgeon"], strongKeywords: ["mbbs", "md", "specialist"] },
  { entity: "lawyer", keywords: ["lawyer", "attorney", "legal", "law firm", "advocate", "litigation"], strongKeywords: ["counsel", "bar"] },
  { entity: "consultant", keywords: ["consultant", "consulting", "strategy", "advisory"], strongKeywords: ["business consultant", "management consulting"] },
  { entity: "developer", keywords: ["developer", "programming", "software", "coding", "code", "fullstack", "backend", "frontend", "api", "saas", "open source", "engineer"], strongKeywords: ["github", "react", "python", "javascript", "typescript", "cloud"], nicheAffinity: ["technology"] },
  { entity: "designer", keywords: ["designer", "ui/ux", "graphic design", "branding", "logo", "web design", "figma", "illustrator"], strongKeywords: ["product designer", "brand designer"] },
  { entity: "artist", keywords: ["artist", "art", "illustration", "painting", "drawing", "sketch", "digital art"], strongKeywords: ["canvas", "gallery", "fine art"] },
  { entity: "musician", keywords: ["musician", "singer", "songwriter", "album", "band", "rapper", "producer", "beat", "concert", "music"], strongKeywords: ["spotify", "song", "playlist"] },
  { entity: "actor", keywords: ["actor", "actress", "film", "movie", "theatre", "casting"], strongKeywords: ["filmstar", "bollywood", "hollywood"] },
  { entity: "photographer", keywords: ["photographer", "photography", "portrait", "landscape", "camera", "wedding photographer"], strongKeywords: ["photoshoot", "prints"] },
  { entity: "trader", keywords: ["trader", "trading", "forex", "stock market", "crypto", "market"], strongKeywords: ["day trading", "candlestick", "signals"] },
  { entity: "investor", keywords: ["investor", "investment", "fund", "equity", "venture", "portfolio"], strongKeywords: ["vc", "angel investor", "sebi"] },
  { entity: "restaurant", keywords: ["restaurant", "chef", "menu", "reservation", "dining", "kitchen", "cuisine", "bistro", "cafe", "food"], strongKeywords: ["book a table", "seafood", "fine dining"] },
  { entity: "startup", keywords: ["startup", "founder", "product", "launch", "venture", "mvp"], strongKeywords: ["y combinator", "seed round"] },
  { entity: "agency", keywords: ["agency", "marketing agency", "creative agency", "digital agency"], strongKeywords: ["ad agency", "media buying"] },
  { entity: "brand", keywords: ["brand", "official", "company", "store", "shop", "label"], strongKeywords: ["corporate", "headquarters"] },
  { entity: "company", keywords: ["company", "corporate", "b2b", "enterprise", "business"], strongKeywords: ["inc", "ltd", "llc"] },
  { entity: "podcast", keywords: ["podcast", "episode", "podcast host", "show"], strongKeywords: ["weekly show", "interview series"] },
  { entity: "public_figure", keywords: ["public figure", "celebrity", "icon", "legend", "personality"], strongKeywords: ["superstar", "national icon"] },
  { entity: "influencer", keywords: ["influencer", "collab", "brand deal", "followers", "content creator", "social media"], strongKeywords: ["viral", "micro influencer"] },
  { entity: "streamer", keywords: ["streamer", "streaming", "live", "twitch", "kicked", "gaming live"], strongKeywords: ["stream schedule"] },
  { entity: "creator", keywords: ["creator", "content", "vlog", "youtube", "channel", "subscribers", "video"], strongKeywords: ["content creator", "views"] },
  { entity: "event", keywords: ["event", "conference", "summit", "festival", "concert", "expo"], strongKeywords: ["tickets", "agenda"] },
  { entity: "ngo", keywords: ["ngo", "nonprofit", "non-profit", "charity", "foundation"], strongKeywords: ["donate", "volunteer"] },
  { entity: "government", keywords: ["government", "official", "ministry", "public sector", "civic"], strongKeywords: ["state", "department"] },
  { entity: "organization", keywords: ["organization", "association", "society", "institute"], strongKeywords: ["membership organization"] },
];

// ── Niches (expanded, weighted) ─────────────────────────────────────────────

export const NICHE_RULES: Record<string, string[]> = {
  sports: ["football", "soccer", "cricket", "basketball", "tennis", "golf", "fifa", "uefa", "champions league", "premier league", "nba", "athlete"],
  fitness: ["fitness", "gym", "workout", "muscle", "training", "nutrition", "wellness", "diet", "yoga", "bodybuilding"],
  nutrition: ["nutrition", "diet", "meal plan", "healthy eating", "protein", "calories"],
  finance: ["finance", "invest", "investing", "money", "stock", "stock market", "crypto", "trading", "budget", "wealth", "financial", "economy", "tax"],
  forex: ["forex", "fx", "currency", "pip", "trading signals", "candlestick"],
  crypto: ["crypto", "bitcoin", "ethereum", "defi", "nft", "blockchain", "web3"],
  ai: ["ai", "artificial intelligence", "machine learning", "llm", "gpt", "openai", "prompt", "generative ai"],
  machine_learning: ["machine learning", "ml", "neural network", "deep learning", "model training"],
  programming: ["programming", "coding", "developer", "code", "software", "typescript", "python", "javascript", "rust"],
  web_development: ["web development", "frontend", "backend", "fullstack", "react", "nextjs", "css", "html"],
  mobile_development: ["mobile development", "flutter", "react native", "ios", "android", "swift"],
  technology: ["tech", "coding", "programming", "software", "app", "developer", "ai", "startup", "innovation", "gadget", "saas", "web3", "data science", "cloud"],
  photography: ["photography", "photo", "camera", "portrait", "landscape", "edit", "lightroom", "photographer", "lens"],
  travel: ["travel", "trip", "vacation", "adventure", "explore", "wanderlust", "destination", "backpack"],
  comedy: ["comedy", "funny", "standup", "joke", "humor", "sketch", "comedian", "roast", "memes", "satire"],
  luxury: ["luxury", "premium", "high-end", "exclusive", "designer", "expensive", "supercar"],
  beauty: ["beauty", "makeup", "skincare", "cosmetics", "hair", "glam"],
  fashion: ["fashion", "style", "outfit", "wardrobe", "streetwear", "brand", "fashion week"],
  gaming: ["gaming", "twitch", "playthrough", "esports", "minecraft", "fortnite", "stream", "gamer", "gameplay", "speedrun"],
  education: ["tutorial", "course", "learn", "lesson", "educational", "how to", "guide", "class", "training", "workshop", "lecture", "study", "teacher", "school"],
  business: ["business", "entrepreneur", "agency", "freelancer", "consultant", "consulting", "coaching", "marketing", "branding", "startup", "founder", "strategy", "b2b"],
  marketing: ["marketing", "seo", "ads", "social media marketing", "content marketing", "branding", "growth"],
  real_estate: ["real estate", "property", "realtor", "housing", "apartment", "commercial real estate"],
  food: ["food", "recipe", "cooking", "baking", "restaurant", "chef", "meal", "cuisine", "kitchen", "foodie", "street food"],
  cooking: ["cooking", "recipe", "baking", "kitchen", "cook", "meal prep"],
  music: ["music", "song", "album", "concert", "guitar", "piano", "singer", "rapper", "producer", "beat", "musician", "melody"],
  dance: ["dance", "choreography", "dancer", "hip hop", "ballet"],
  health: ["health", "wellness", "medical", "doctor", "mental health", "therapy"],
  mental_health: ["mental health", "mindfulness", "therapy", "anxiety", "depression", "wellbeing"],
  productivity: ["productivity", "focus", "habits", "time management", "notion", "efficiency"],
  parenting: ["parenting", "mom", "dad", "kids", "family", "parenting tips"],
  pets: ["pets", "dog", "cat", "pet care", "veterinary", "animal"],
  automotive: ["automotive", "car", "cars", "review", "supercar", "mechanic", "ev"],
  science: ["science", "physics", "chemistry", "biology", "space", "research", "astronomy"],
  art: ["art", "drawing", "painting", "sketch", "illustration", "digital art", "creative", "design", "artist", "canvas"],
  celebrity: ["celebrity", "star", "famous", "icon", "legend", "bollywood", "hollywood", "glamour"],
  entertainment: ["entertainment", "challenge", "prank", "fun", "show", "skit", "reaction", "viral"],
  podcast: ["podcast", "episode", "interview", "show"],
  lifestyle: ["lifestyle", "daily", "vlog", "routine", "fashion", "beauty", "home", "family", "life", "motivation", "inspiration"],
  film: ["film", "movies", "cinema", "actor", "actress", "director", "film review"],
  news: ["news", "breaking", "update", "report", "politics", "world", "journalism"],
};

// ── Business models ─────────────────────────────────────────────────────────

export const BUSINESS_MODELS = [
  "courses", "consulting", "membership", "affiliate", "products", "services",
  "community", "newsletter", "speaking", "sponsorship", "coaching",
  "digital_products", "software", "marketplace",
] as const;
export type BusinessModelType = (typeof BUSINESS_MODELS)[number];

export const BUSINESS_MODEL_KEYWORDS: Record<BusinessModelType, string[]> = {
  courses: ["course", "curriculum", "learn", "tutorial", "academy", "masterclass", "enroll"],
  consulting: ["consulting", "consultation", "strategy call", "advisory"],
  membership: ["membership", "members", "premium community", "patreon", "exclusive access"],
  affiliate: ["affiliate", "sponsor", "partner program", "commission", "affiliate link"],
  products: ["shop", "store", "merch", "product", "ecommerce", "buy now", "order"],
  services: ["services", "booking", "hire", "book a", "quote", "service"],
  community: ["community", "discord", "members", "group", "network"],
  newsletter: ["newsletter", "subscribe", "weekly", "email list", "sign up"],
  speaking: ["speaking", "keynote", "talks", "workshop", "panel"],
  sponsorship: ["sponsorship", "brand deals", "partnerships", "collabs"],
  coaching: ["coaching", "coach", "1:1", "mentorship", "personal training"],
  digital_products: ["digital product", "templates", "ebook", "presets", "pack", "download"],
  software: ["software", "saas", "app", "api", "platform", "tool", "subscription"],
  marketplace: ["marketplace", "buy and sell", "listing", "marketplace for"],
};

// ── Audience segments ───────────────────────────────────────────────────────

export const AUDIENCE_SEGMENTS = [
  "beginners", "professionals", "students", "parents", "creators",
  "developers", "traders", "investors", "fitness", "education",
] as const;
export type AudienceSegment = (typeof AUDIENCE_SEGMENTS)[number];

export const AUDIENCE_KEYWORDS: Record<AudienceSegment, string[]> = {
  beginners: ["beginner", "new to", "starting", "for everyone", "easy", "simple"],
  professionals: ["professional", "career", "business", "enterprise", "b2b", "corporate"],
  students: ["student", "school", "college", "university", "exam", "study"],
  parents: ["parent", "mom", "dad", "family", "kids"],
  creators: ["creator", "content creator", "influencer", "youtuber"],
  developers: ["developer", "programmer", "engineer", "coding", "software"],
  traders: ["trader", "investor", "forex", "stock"],
  investors: ["investor", "investment", "wealth", "equity"],
  fitness: ["fitness", "gym", "workout", "healthy", "nutrition"],
  education: ["learn", "course", "tutorial", "study", "training"],
};

// ── Recommendations (entity → config) ───────────────────────────────────────

export interface RecommendationConfig {
  theme: string;
  sections: string[];
  cta: string;
  products: string[];
  services: string[];
  brandTone: string;
  colorStyle: string;
  typography: string;
  seoKeywords: string[];
}

export const RECOMMENDATIONS: Partial<Record<EvidenceEntityType, RecommendationConfig>> = {
  athlete: {
    theme: "bold-sport",
    sections: ["hero", "timeline", "products", "gallery"],
    cta: "Shop the collection",
    products: ["Signed merchandise", "Training program"],
    services: [],
    brandTone: "energetic",
    colorStyle: "high-contrast",
    typography: "bold-condensed",
    seoKeywords: ["athlete", "training", "merchandise"],
  },
  restaurant: {
    theme: "warm-dining",
    sections: ["hero", "menu", "testimonials", "reservations"],
    cta: "Book a table",
    products: [],
    services: ["Dine in", "Catering"],
    brandTone: "welcoming",
    colorStyle: "warm-neutral",
    typography: "serif-elegant",
    seoKeywords: ["restaurant", "menu", "reservations", "local dining"],
  },
  developer: {
    theme: "dark-tech",
    sections: ["hero", "projects", "blog", "contact"],
    cta: "View my work",
    products: ["Open source", "Templates"],
    services: ["Contracting", "Consulting"],
    brandTone: "technical",
    colorStyle: "dark-neon",
    typography: "mono-modern",
    seoKeywords: ["developer", "portfolio", "projects", "github"],
  },
  educator: {
    theme: "academic",
    sections: ["hero", "courses", "testimonials", "blog"],
    cta: "Enroll now",
    products: ["Online course"],
    services: [],
    brandTone: "inspiring",
    colorStyle: "calm-blue",
    typography: "clean-sans",
    seoKeywords: ["course", "learn", "education"],
  },
  teacher: {
    theme: "academic",
    sections: ["hero", "courses", "blog"],
    cta: "Start learning",
    products: ["Workbook", "Study plan"],
    services: ["Tutoring"],
    brandTone: "friendly",
    colorStyle: "calm-blue",
    typography: "clean-sans",
    seoKeywords: ["teacher", "lessons", "study"],
  },
  doctor: {
    theme: "clean-medical",
    sections: ["hero", "services", "testimonials", "contact"],
    cta: "Book an appointment",
    products: [],
    services: ["Consultation", "Check-up"],
    brandTone: "trustworthy",
    colorStyle: "clinical-white",
    typography: "clean-sans",
    seoKeywords: ["doctor", "clinic", "appointment"],
  },
  photographer: {
    theme: "minimal-photo",
    sections: ["hero", "gallery", "products", "contact"],
    cta: "Book a shoot",
    products: ["Prints", "Presets"],
    services: ["Portrait session", "Wedding photography"],
    brandTone: "artistic",
    colorStyle: "neutral-minimal",
    typography: "elegant-serif",
    seoKeywords: ["photographer", "portrait", "wedding photography"],
  },
  musician: {
    theme: "dark-concert",
    sections: ["hero", "gallery", "products", "contact"],
    cta: "Listen now",
    products: ["Album", "Merch"],
    services: ["Live performance", "Booking"],
    brandTone: "expressive",
    colorStyle: "deep-purple",
    typography: "display-bold",
    seoKeywords: ["musician", "music", "album", "tour"],
  },
  coach: {
    theme: "energetic-coach",
    sections: ["hero", "services", "testimonials", "contact"],
    cta: "Book a session",
    products: ["Program"],
    services: ["1:1 coaching"],
    brandTone: "motivating",
    colorStyle: "vibrant-orange",
    typography: "bold-sans",
    seoKeywords: ["coach", "coaching", "training"],
  },
  agency: {
    theme: "corporate-agency",
    sections: ["hero", "services", "portfolio", "contact"],
    cta: "Get a quote",
    products: [],
    services: ["Marketing", "Branding", "Growth"],
    brandTone: "professional",
    colorStyle: "corporate-blue",
    typography: "clean-sans",
    seoKeywords: ["agency", "marketing", "branding"],
  },
  startup: {
    theme: "startup-launch",
    sections: ["hero", "products", "gallery", "contact"],
    cta: "Get early access",
    products: ["Product"],
    services: [],
    brandTone: "innovative",
    colorStyle: "electric-violet",
    typography: "modern-sans",
    seoKeywords: ["startup", "product", "launch"],
  },
  streamer: {
    theme: "gamer-stream",
    sections: ["hero", "gallery", "products", "contact"],
    cta: "Subscribe",
    products: ["Merch"],
    services: [],
    brandTone: "playful",
    colorStyle: "vivid-purple",
    typography: "display-rounded",
    seoKeywords: ["streamer", "live", "gaming"],
  },
  influencer: {
    theme: "creator-lifestyle",
    sections: ["hero", "gallery", "products", "contact"],
    cta: "Work with me",
    products: ["Digital pack"],
    services: ["Brand partnership"],
    brandTone: "friendly",
    colorStyle: "soft-pastel",
    typography: "modern-sans",
    seoKeywords: ["influencer", "collab", "brand"],
  },
  creator: {
    theme: "creator-lifestyle",
    sections: ["hero", "products", "gallery", "testimonials"],
    cta: "Get started",
    products: ["Digital products"],
    services: [],
    brandTone: "warm",
    colorStyle: "indigo-gradient",
    typography: "modern-sans",
    seoKeywords: ["creator", "content", "store"],
  },
  fitness: {
    theme: "energetic-coach",
    sections: ["hero", "services", "testimonials", "contact"],
    cta: "Start training",
    products: ["Workout plan"],
    services: ["Personal training"],
    brandTone: "motivating",
    colorStyle: "vibrant-orange",
    typography: "bold-sans",
    seoKeywords: ["fitness", "workout", "training"],
  },
};
