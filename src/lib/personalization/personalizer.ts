import { nicheDetector } from "./niche";
import type { Niche } from "./niche";

export interface PersonalizationResult {
  templateId: string;
  themePackageId: string;
  tagline: string;
  bio: string;
  heroTitle: string;
  heroSubtitle: string;
  seoTitle: string;
  seoDescription: string;
}

const NICHE_TEMPLATES: Record<Niche, string> = {
  gaming: "gaming",
  fitness: "fitness",
  education: "education",
  music: "music",
  restaurant: "restaurant",
  technology: "gaming",
  fashion: "portfolio",
  art: "portfolio",
  photography: "portfolio",
  travel: "portfolio",
  lifestyle: "fitness",
  business: "agency",
  entertainment: "gaming",
  sports: "fitness",
  health: "fitness",
  general: "gaming",
};

const NICHE_THEMES: Record<Niche, string> = {
  gaming: "neon-dark",
  fitness: "forest-canopy",
  education: "slate-minimal",
  music: "royal-plum",
  restaurant: "warm-ember",
  technology: "midnight-ocean",
  fashion: "royal-plum",
  art: "royal-plum",
  photography: "slate-minimal",
  travel: "midnight-ocean",
  lifestyle: "forest-canopy",
  business: "slate-minimal",
  entertainment: "neon-dark",
  sports: "forest-canopy",
  health: "forest-canopy",
  general: "neon-dark",
};

function generateTagline(name: string, niche: Niche): string {
  const templates: Record<Niche, string[]> = {
    gaming: ["Professional {name} — Live, Play, Dominate", "Your favorite {name} streams and content", "{name} — Gaming at its finest"],
    fitness: ["Transform your body with {name}", "{name} — Your fitness journey starts here", "Train smarter with {name}"],
    education: ["Learn from {name}", "{name} — Knowledge that empowers", "Education reimagined by {name}"],
    music: ["Listen to {name}", "{name} — Music that moves you", "Original sounds from {name}"],
    restaurant: ["Taste the difference with {name}", "{name} — Culinary excellence", "Cooked with love by {name}"],
    technology: ["Tech insights from {name}", "{name} — Future-proof your knowledge", "Innovation explained by {name}"],
    fashion: ["Style curated by {name}", "{name} — Define your look", "Fashion forward with {name}"],
    art: ["Art by {name}", "{name} — Creating visions", "Explore the imagination of {name}"],
    photography: ["Captured by {name}", "{name} — Stories through the lens", "Moments frozen by {name}"],
    travel: ["Explore with {name}", "{name} — Wander without boundaries", "Adventure awaits with {name}"],
    lifestyle: ["Live better with {name}", "{name} — Curating the good life", "Everyday inspiration from {name}"],
    business: ["Scale with {name}", "{name} — Business strategies that work", "Entrepreneurial insights from {name}"],
    entertainment: ["Entertained by {name}", "{name} — Laugh, learn, enjoy", "Content that connects by {name}"],
    sports: ["Train with {name}", "{name} — Peak performance", "Athletic excellence from {name}"],
    health: ["Heal with {name}", "{name} — Your wellness journey", "Mindful living with {name}"],
    general: ["Welcome to {name}", "{name} — Creator. Storyteller. Icon.", "Everything {name} in one place"],
  };
  const options = templates[niche] || templates.general;
  return options[Math.floor(Math.random() * options.length)].replace(/\{name\}/g, name);
}

function generateBio(name: string, niche: Niche): string {
  const templates: Record<Niche, string[]> = {
    gaming: ["{name} is a professional gamer and content creator known for competitive gameplay and engaging streams.", "{name} creates gaming content that entertains, educates, and inspires the next generation of players."],
    fitness: ["{name} is a certified fitness coach dedicated to helping you achieve your health and wellness goals.", "{name} provides expert fitness guidance, workout programs, and nutritional advice."],
    education: ["{name} is an educator passionate about making learning accessible, engaging, and effective for everyone.", "{name} creates courses and content that simplify complex topics."],
    music: ["{name} is a musician and artist creating original music that resonates with audiences worldwide.", "{name} produces, performs, and shares musical artistry with the world."],
    restaurant: ["{name} is a chef and culinary artist dedicated to creating memorable dining experiences.", "{name} shares recipes, cooking techniques, and culinary adventures."],
    technology: ["{name} is a tech enthusiast breaking down complex topics into digestible insights.", "{name} reviews, analyzes, and explains the latest in technology."],
    fashion: ["{name} is a fashion and style curator helping you express your unique identity through clothing.", "{name} shares style tips, trends, and fashion inspiration."],
    art: ["{name} is a visual artist creating stunning works that push creative boundaries.", "{name} shares artistic processes, tutorials, and original creations."],
    photography: ["{name} is a photographer capturing moments that tell powerful stories.", "{name} shares photography tips, gear reviews, and visual narratives."],
    travel: ["{name} is a traveler exploring the world and sharing adventures with a global community.", "{name} provides travel guides, tips, and destination inspiration."],
    lifestyle: ["{name} creates lifestyle content that inspires, motivates, and connects.", "{name} shares daily routines, wellness tips, and personal stories."],
    business: ["{name} is an entrepreneur and business strategist helping others build and scale.", "{name} shares business insights, marketing strategies, and growth tactics."],
    entertainment: ["{name} creates entertaining content that brings joy and laughter to audiences.", "{name} produces comedy, skits, and engaging entertainment."],
    sports: ["{name} is an athlete and sports enthusiast dedicated to peak performance.", "{name} shares training tips, sports analysis, and fitness motivation."],
    health: ["{name} is a wellness advocate helping others live healthier, happier lives.", "{name} shares mindfulness practices, health tips, and holistic wellness guidance."],
    general: ["{name} is a creator building a community through authentic content and meaningful connections.", "{name} shares passion projects, creative work, and personal stories."],
  };
  const options = templates[niche] || templates.general;
  return options[Math.floor(Math.random() * options.length)].replace(/\{name\}/g, name);
}

function generateHeroTitle(name: string): string {
  const prefixes = ["Welcome to", "Discover", "Experience", "Join", "Explore", "Meet"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix} ${name}`;
}

function generateHeroSubtitle(name: string, niche: Niche): string {
  const subtitles: Record<Niche, string[]> = {
    gaming: ["Live streams, gaming content, and more.", "Your destination for epic gaming moments.", "Level up with exclusive gaming content."],
    fitness: ["Transform your body and mind.", "Your fitness journey starts today.", "Achieve your health goals with expert guidance."],
    education: ["Learn something new every day.", "Knowledge that transforms lives.", "Education reimagined for the modern world."],
    music: ["Feel the music. Experience the art.", "Original tracks and exclusive content.", "Where sound meets soul."],
    restaurant: ["Taste the extraordinary.", "Culinary creations that delight.", "Every dish tells a story."],
    technology: ["Tech insights for the modern world.", "Innovation explained simply.", "Future-proof your knowledge."],
    fashion: ["Define your unique style.", "Fashion that speaks volumes.", "Curated looks for every occasion."],
    art: ["Where imagination meets creation.", "Art that inspires and connects.", "Creative visions brought to life."],
    photography: ["Stories through the lens.", "Capturing moments that matter.", "Photography that tells your story."],
    travel: ["Explore without boundaries.", "Adventure awaits around every corner.", "Travel stories that inspire wanderlust."],
    lifestyle: ["Curating the good life.", "Everyday inspiration for a better you.", "Live intentionally. Live beautifully."],
    business: ["Strategies that scale.", "Business insights for modern entrepreneurs.", "Build, grow, and dominate your market."],
    entertainment: ["Content that connects and entertains.", "Laugh, learn, and enjoy the show.", "Entertainment crafted with passion."],
    sports: ["Peak performance starts here.", "Train smarter. Achieve more.", "Athletic excellence for everyone."],
    health: ["Your wellness journey starts here.", "Mindful living for a balanced life.", "Health tips that transform lives."],
    general: ["Creator. Storyteller. Icon.", "Authentic content for a connected world.", "Building community through creativity."],
  };
  const options = subtitles[niche] || subtitles.general;
  return options[Math.floor(Math.random() * options.length)];
}

function generateSeoTitle(name: string, niche: Niche): string {
  const templates: Record<Niche, string> = {
    gaming: "{name} — Gaming Content, Live Streams & More",
    fitness: "{name} — Fitness Coach, Workouts & Wellness Tips",
    education: "{name} — Courses, Tutorials & Educational Content",
    music: "{name} — Music, Songs & Exclusive Content",
    restaurant: "{name} — Recipes, Cooking Tips & Culinary Content",
    technology: "{name} — Tech Reviews, Tutorials & Insights",
    fashion: "{name} — Fashion, Style & Lifestyle Content",
    art: "{name} — Art, Design & Creative Portfolio",
    photography: "{name} — Photography, Portfolios & Visual Stories",
    travel: "{name} — Travel Guides, Tips & Adventure Stories",
    lifestyle: "{name} — Lifestyle, Wellness & Daily Inspiration",
    business: "{name} — Business Strategy, Marketing & Growth Tips",
    entertainment: "{name} — Entertainment, Comedy & Viral Content",
    sports: "{name} — Sports, Fitness & Athletic Performance",
    health: "{name} — Health, Wellness & Mindful Living",
    general: "{name} — Creator, Content & Community",
  };
  return (templates[niche] || templates.general).replace(/\{name\}/g, name);
}

function generateSeoDescription(name: string, niche: Niche): string {
  const descriptions: Record<Niche, string[]> = {
    gaming: ["Explore {name}'s gaming world — live streams, highlights, and exclusive content for true fans.", "Join {name} on an epic gaming journey with daily content, pro tips, and community events."],
    fitness: ["Transform your fitness journey with {name}'s expert workouts, nutrition plans, and motivational content.", "Achieve your health goals with {name}'s proven fitness programs and wellness guidance."],
    education: ["Learn from {name}'s expert courses and tutorials. Master new skills with engaging educational content.", "Expand your knowledge with {name}'s comprehensive courses and learning resources."],
    music: ["Experience {name}'s original music, exclusive tracks, and behind-the-scenes content.", "Discover the sounds of {name} — original music, live performances, and creative collaborations."],
    restaurant: ["Explore {name}'s culinary world — recipes, cooking tips, and gastronomic adventures.", "Cook along with {name}'s recipes and discover the art of great food."],
    technology: ["Stay ahead with {name}'s tech reviews, tutorials, and industry insights.", "Get {name}'s take on the latest technology trends, gadgets, and innovations."],
    fashion: ["Discover your style with {name}'s fashion guides, trend reports, and styling tips.", "Follow {name} for daily fashion inspiration, style tips, and trend analyses."],
    art: ["Explore {name}'s artistic journey — original works, creative processes, and art tutorials.", "Immerse yourself in {name}'s world of creativity and visual expression."],
    photography: ["See the world through {name}'s lens — photography tips, gear reviews, and visual stories.", "Capture stunning images with {name}'s photography tutorials and creative inspiration."],
    travel: ["Travel the world with {name} — destination guides, travel tips, and adventure stories.", "Explore hidden gems and popular destinations through {name}'s travel adventures."],
    lifestyle: ["Live your best life with {name}'s lifestyle tips, wellness advice, and daily inspiration.", "Join {name} on a journey to better living — wellness, style, and personal growth."],
    business: ["Scale your business with {name}'s expert strategies, marketing insights, and growth tactics.", "Learn from {name}'s entrepreneurial journey and transform your business."],
    entertainment: ["Get entertained by {name}'s comedy, skits, and viral content. Laughter guaranteed.", "Join {name} for daily entertainment, funny moments, and engaging content."],
    sports: ["Train like a pro with {name}'s sports tips, workout routines, and athletic insights.", "Achieve peak performance with {name}'s expert sports and fitness guidance."],
    health: ["Transform your wellbeing with {name}'s health tips, mindfulness practices, and holistic guidance.", "Start your wellness journey with {name} — mind, body, and soul."],
    general: ["Explore {name}'s world of creativity, content, and community. Join the journey.", "Discover everything {name} creates — from inspiring content to exclusive community access."],
  };
  const options = descriptions[niche] || descriptions.general;
  return options[Math.floor(Math.random() * options.length)].replace(/\{name\}/g, name);
}

class WebsitePersonalizer {
  personalize(name: string, sourceUrl?: string): PersonalizationResult {
    const niche = sourceUrl
      ? nicheDetector.detectFromUrl(sourceUrl)
      : nicheDetector.detect(name);

    const templateId = NICHE_TEMPLATES[niche] || "gaming";
    const themePackageId = NICHE_THEMES[niche] || "neon-dark";

    // Use the niche-specific name-suffix to differentiate same-niche creators
    const uniqueName = sourceUrl
      ? name + " " + (sourceUrl.match(/@([a-z0-9_-]+)/i)?.[1]?.slice(0, 4) || "")
      : name;
    const displayName = uniqueName.trim();

    return {
      templateId,
      themePackageId,
      tagline: generateTagline(displayName, niche),
      bio: generateBio(displayName, niche),
      heroTitle: generateHeroTitle(displayName),
      heroSubtitle: generateHeroSubtitle(displayName, niche),
      seoTitle: generateSeoTitle(displayName, niche),
      seoDescription: generateSeoDescription(displayName, niche),
    };
  }
}

export const websitePersonalizer = new WebsitePersonalizer();
