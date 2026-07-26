import { describe, it, expect, beforeAll } from "vitest";
import type { ContentSource, ContentItem, KnowledgeGraph } from "@/lib/generation/intelligence/types";
import { KnowledgeBuilder } from "@/lib/generation/intelligence/knowledge-builder";
import { PersonaEngine, ExperienceProfileBuilder } from "@/lib/generation/persona/engine";
import { PlanningContextEngine } from "@/lib/generation/planning-context/engine";
import { ExperiencePlanningEngine } from "@/lib/generation/experience-plan/engine";
import type { ExperienceProfile } from "@/lib/generation/persona/types";
import type { PlanningContext } from "@/lib/generation/planning-context/types";
import type { ExperiencePlan } from "@/lib/generation/experience-plan/types";


const knowledgeBuilder = new KnowledgeBuilder();
const personaEngine = new PersonaEngine();
const profileBuilder = new ExperienceProfileBuilder();
const planningEngine = new PlanningContextEngine();
const planningEngineExp = new ExperiencePlanningEngine();

function makeItem(text: string, overrides?: Partial<ContentItem>): ContentItem {
  return {
    id: "1", type: "post", text, hashtags: [], mentions: [],
    likes: 100, comments: 10, shares: 5, createdAt: new Date().toISOString(), url: "https://example.com",
    ...overrides,
  };
}

function makeSource(overrides: Partial<ContentSource> & { displayName?: string; bio?: string; followers?: number; content?: ContentItem[]; categories?: string[]; links?: string[] }): ContentSource {
  return {
    platform: "youtube",
    username: overrides.displayName?.toLowerCase().replace(/\s+/g, "") ?? "creator",
    displayName: overrides.displayName ?? "Creator",
    bio: overrides.bio ?? "",
    avatarUrl: "",
    followers: overrides.followers ?? 10000,
    following: 500,
    posts: 100,
    engagement: 0.05,
    content: overrides.content ?? [],
    categories: overrides.categories ?? [],
    links: overrides.links ?? [],
  };
}

interface CreatorResult {
  id: string; name: string; niche: string;
  graph: KnowledgeGraph; persona: { id: string; name: string; score: number };
  profile: ExperienceProfile; context: PlanningContext; plan: ExperiencePlan;
  scores: Record<string, number>; issues: string[];
}

interface CreatorSpec {
  id: string; name: string; source: ContentSource; expectedNiche: string;
  expectedPersonaId?: string; expectedPersonaName?: string;
}

const CREATORS: CreatorSpec[] = [
  // ── GAMING ──
  {
    id: "gaming-001", name: "WiffeyGamer",
    source: makeSource({
      displayName: "Wiffey Gamer", followers: 35000,
      bio: "Gaming streamer and content creator. Official channel. Live streams and gameplay highlights. Join our community on Discord!",
      categories: ["gaming"], links: ["https://discord.gg/wiffey", "https://twitch.tv/wiffeygamer"],
      content: [
        makeItem("Epic gaming stream highlights from today #gaming #stream #gameplay", { type: "stream" }),
        makeItem("New Fortnite gameplay strategy guide #fortnite #gaming", { type: "gameplay" }),
        makeItem("Minecraft survival series episode 5 #minecraft #gaming", { type: "video" }),
        makeItem("Live stream announcement - 8 PM EST tonight! #stream #gaming", { type: "stream" }),
        makeItem("Best gaming moments compilation #gaming #highlights", { type: "video" }),
      ],
    }),
    expectedNiche: "gaming",
  },
  {
    id: "gaming-002", name: "ProGamer",
    source: makeSource({
      displayName: "Pro Gamer", followers: 200000,
      bio: "Professional esports player for Team Alpha. Competitive tournament player and coach. Official brand partner. Esports and competitive gaming content.",
      categories: ["gaming", "esports"], links: ["https://teamalpha.gg", "https://merch.pro-gamer.com"],
      content: [
        makeItem("Tournament finals recap - we took 2nd place! #esports #competitive #tournament", { type: "competitive" }),
        makeItem("Pro tips: how to improve your aim in FPS games #gaming #tips", { type: "tutorial" }),
        makeItem("Behind the scenes at the championship #esports #pro #team", { type: "esports" }),
        makeItem("New merch drop - limited edition hoodies #merch #gaming #store", { type: "promotional" }),
        makeItem("Training vlog: a day in the life of a pro gamer #esports #training", { type: "esports" }),
      ],
    }),
    expectedNiche: "gaming",
  },
  // ── EDUCATION ──
  {
    id: "education-001", name: "Class9MathsScience",
    source: makeSource({
      displayName: "Class 9 Maths & Science", followers: 15000,
      bio: "Free educational content for Class 9 students. Learn maths and science with easy tutorials. Official educational channel.",
      categories: ["education"], links: ["https://class9study.com"],
      content: [
        makeItem("Algebra made easy - learn linear equations #education #math #tutorial", { type: "tutorial" }),
        makeItem("Science experiment: chemical reactions explained #science #educational", { type: "educational" }),
        makeItem("CBSE exam preparation tips for Class 9 students #study #education", { type: "educational" }),
        makeItem("Geometry basics: triangles and theorems #math #tutorial #class9", { type: "tutorial" }),
        makeItem("Physics: Newton's laws of motion explained #science #education", { type: "educational" }),
        makeItem("Quick revision notes for final exams #study #educational", { type: "educational" }),
      ],
    }),
    expectedNiche: "education",
  },
  {
    id: "education-002", name: "MasterClassAcademy",
    source: makeSource({
      displayName: "MasterClass Academy", followers: 50000,
      bio: "Professional training academy offering certified courses and programs. Learn from industry experts. Official institute for online education.",
      categories: ["education"], links: ["https://masterclass.academy", "https://courses.masterclass.academy"],
      content: [
        makeItem("New course: Complete Web Development Bootcamp 2024 #course #education", { type: "educational" }),
        makeItem("MasterClass certification program now open for enrollment #certification", { type: "educational" }),
        makeItem("Student success story: how Sarah went from beginner to professional #education", { type: "educational" }),
        makeItem("Workshop: Data Science fundamentals with Python #workshop #learn", { type: "educational" }),
        makeItem("Curriculum overview: our structured learning paths #education #program", { type: "educational" }),
        makeItem("Faculty introduction: meet our expert instructors #academy #learn", { type: "educational" }),
        makeItem("Special offer: 20% off all courses this month #course #education", { type: "promotional" }),
      ],
    }),
    expectedNiche: "education",
  },
  // ── TECHNOLOGY ──
  {
    id: "tech-001", name: "TheCodeMaster",
    source: makeSource({
      displayName: "The Code Master", followers: 15000,
      bio: "Full-stack developer and coding educator. Teaching programming and software development. Open source contributor and tech content creator.",
      categories: ["technology"], links: ["https://github.com/thecodemaster", "https://codemaster.dev"],
      content: [
        makeItem("Building a REST API with Node.js and Express #coding #programming #tutorial", { type: "tutorial" }),
        makeItem("React hooks explained simply #react #javascript #coding", { type: "tutorial" }),
        makeItem("My VS Code setup for productive coding #developer #tools", { type: "tutorial" }),
        makeItem("Open source contribution guide for beginners #opensource #coding", { type: "tutorial" }),
        makeItem("Tech stack review: best tools for full-stack development #tech #developer", { type: "tutorial" }),
        makeItem("Debugging tips every developer should know #programming #coding", { type: "tutorial" }),
      ],
    }),
    expectedNiche: "technology",
  },
  {
    id: "tech-002", name: "DevToolSaaS",
    source: makeSource({
      displayName: "DevTool SaaS", followers: 8000,
      bio: "Building developer tools and SaaS products. Official software company providing API access and developer resources. Startup founder sharing the journey.",
      categories: ["technology", "business"], links: ["https://devtool.io", "https://api.devtool.io"],
      content: [
        makeItem("Launching our API v2 - new features for developers #saas #startup", { type: "promotional" }),
        makeItem("How we built our SaaS product in 3 months #startup #saas #software", { type: "educational" }),
        makeItem("Revenue milestones: first $10K MRR journey #business #saas", { type: "educational" }),
        makeItem("Product roadmap for Q3 2024 #product #software", { type: "promotional" }),
        makeItem("Customer interview: how DevTool saved them 20 hours/week #business", { type: "educational" }),
      ],
    }),
    expectedNiche: "technology",
  },
  // ── FINANCE ──
  {
    id: "finance-001", name: "MoneyWise",
    source: makeSource({
      displayName: "MoneyWise Finance", followers: 25000,
      bio: "Personal finance education and investment guidance. Learn budgeting, saving, and wealth building. Official financial education channel.",
      categories: ["finance"], links: ["https://moneywise.com"],
      content: [
        makeItem("Beginner's guide to stock market investing #finance #invest #money", { type: "guide" }),
        makeItem("Budgeting tips that actually work #finance #budget #saving", { type: "educational" }),
        makeItem("Crypto basics: what you need to know before investing #crypto #finance", { type: "educational" }),
        makeItem("How to build an emergency fund in 6 months #financial #saving", { type: "guide" }),
        makeItem("Retirement planning for millennials #finance #wealth #retirement", { type: "educational" }),
        makeItem("Common investing mistakes to avoid #invest #financial #education", { type: "educational" }),
      ],
    }),
    expectedNiche: "finance",
  },
  {
    id: "finance-002", name: "InvestPro",
    source: makeSource({
      displayName: "InvestPro Advisory", followers: 100000,
      bio: "Professional investment advisor and financial consultant. Expert analysis on stocks, real estate, and wealth management. Official advisory firm.",
      categories: ["finance", "business"], links: ["https://investpro.com", "https://consult.investpro.com"],
      content: [
        makeItem("Market analysis: Q2 earnings season outlook #finance #invest #analysis", { type: "analysis" }),
        makeItem("Real estate investing strategies for 2024 #invest #realestate #wealth", { type: "strategy" }),
        makeItem("Portfolio diversification guide for professionals #investment #finance", { type: "professional" }),
        makeItem("Expert consultation: retirement planning strategies #consultant #financial", { type: "strategy" }),
        makeItem("Wealth management tips from a professional advisor #finance #expert", { type: "professional" }),
        makeItem("Stock picks for the month - professional analysis #invest #stock", { type: "analysis" }),
      ],
    }),
    expectedNiche: "finance",
  },
  // ── PHOTOGRAPHY ──
  {
    id: "photo-001", name: "LensMaster",
    source: makeSource({
      displayName: "LensMaster Photography", followers: 12000,
      bio: "Nature and landscape photographer capturing the beauty of the outdoors. Fine art prints available. Official store.",
      categories: ["photography"], links: ["https://lensmasterprints.com", "https://presets.lensmaster.com"],
      content: [
        makeItem("Sunset photography tips for beginners #photography #landscape #nature", { type: "educational" }),
        makeItem("New print collection: Mountain landscapes #photography #fineart #print", { type: "promotional" }),
        makeItem("Camera gear review: best lenses for landscape photography #camera #photography", { type: "review" }),
        makeItem("Editing tutorial: Lightroom presets for nature photos #photography #edit", { type: "tutorial" }),
        makeItem("Behind the shot: how I captured this sunrise #photography #nature", { type: "educational" }),
      ],
    }),
    expectedNiche: "photography",
  },
  {
    id: "photo-002", name: "WeddingStories",
    source: makeSource({
      displayName: "Wedding Stories Photography", followers: 8000,
      bio: "Wedding and event photographer capturing your special moments. Professional wedding packages available. Official photography studio.",
      categories: ["photography"], links: ["https://weddingstories.com", "https://booking.weddingstories.com"],
      content: [
        makeItem("Beautiful wedding at the countryside venue #wedding #photography #bride", { type: "portfolio" }),
        makeItem("Engagement shoot ideas for couples #photography #wedding #portrait", { type: "educational" }),
        makeItem("Wedding photography timeline: how we plan the perfect day #wedding", { type: "educational" }),
        makeItem("Behind the scenes at a wedding shoot #photography #event", { type: "behind_scenes" }),
        makeItem("Portfolio: best wedding photos of 2024 #wedding #gallery", { type: "portfolio" }),
      ],
    }),
    expectedNiche: "photography",
  },
  // ── FITNESS ──
  {
    id: "fitness-001", name: "FitWithSarah",
    source: makeSource({
      displayName: "Fit With Sarah", followers: 20000,
      bio: "Personal trainer and fitness coach helping you achieve your goals. Official training programs and meal plans available.",
      categories: ["fitness"], links: ["https://fitwithsarah.com", "https://programs.fitwithsarah.com"],
      content: [
        makeItem("30-day fitness challenge - day 1 #fitness #workout #training", { type: "educational" }),
        makeItem("Home workout routine - no equipment needed #fitness #exercise #health", { type: "workout" }),
        makeItem("Nutrition tips for muscle building #fitness #nutrition #diet", { type: "educational" }),
        makeItem("Personal training session preview #fitness #personal trainer #training", { type: "workout" }),
        makeItem("Transformation story: how I lost 20 pounds #fitness #health", { type: "educational" }),
      ],
    }),
    expectedNiche: "fitness",
  },
  {
    id: "fitness-002", name: "YogaFlowStudio",
    source: makeSource({
      displayName: "Yoga Flow Studio", followers: 50000,
      bio: "Yoga teacher and meditation guide. Find your inner peace through mindful movement. Official yoga studio.",
      categories: ["fitness"], links: ["https://yogaflow.com", "https://meditation.yogaflow.com"],
      content: [
        makeItem("Morning yoga routine for beginners #yoga #meditation #wellness", { type: "yoga" }),
        makeItem("Guided meditation for stress relief #meditation #mindfulness #yoga", { type: "meditation" }),
        makeItem("Yoga pose tutorial: perfect your downward dog #yoga #asana", { type: "yoga" }),
        makeItem("5-minute breathing exercise for anxiety #meditation #wellness", { type: "meditation" }),
        makeItem("Yoga retreat information - join us in Bali #yoga #retreat", { type: "wellness" }),
      ],
    }),
    expectedNiche: "fitness",
  },
  // ── FOOD ──
  {
    id: "food-001", name: "TastyBites",
    source: makeSource({
      displayName: "Tasty Bites Kitchen", followers: 30000,
      bio: "Recipe creator and cooking enthusiast. Delicious recipes for every occasion. Official cookbook and digital recipe cards available.",
      categories: ["food"], links: ["https://tastybites.com", "https://recipes.tastybites.com"],
      content: [
        makeItem("Easy pasta recipe for busy weeknights #recipe #cooking #food", { type: "recipe" }),
        makeItem("Baking tutorial: perfect chocolate cake #baking #dessert #cake", { type: "baking" }),
        makeItem("Meal prep ideas for the whole week #cooking #recipe #kitchen", { type: "recipe" }),
        makeItem("Restaurant-style curry at home #food #cooking #delicious", { type: "cooking" }),
        makeItem("Kitchen gadgets that changed my cooking #kitchen #cooking #food", { type: "review" }),
      ],
    }),
    expectedNiche: "food",
  },
  {
    id: "food-002", name: "GourmetKitchen",
    source: makeSource({
      displayName: "Gourmet Home Kitchen", followers: 5000,
      bio: "Home chef sharing family recipes and cooking tips. Homemade meals made simple. Digital recipe cards available.",
      categories: ["food"], links: ["https://gourmethome.com"],
      content: [
        makeItem("My grandmother's secret pasta sauce recipe #homemade #recipe #cooking", { type: "recipe" }),
        makeItem("Family dinner ideas that everyone will love #homecook #food", { type: "recipe" }),
        makeItem("How to host a dinner party on a budget #homemade #cooking", { type: "educational" }),
        makeItem("Comfort food recipes for cozy nights #recipe #kitchen #food", { type: "recipe" }),
        makeItem("Easy appetizers for holiday gatherings #cooking #homemade", { type: "recipe" }),
      ],
    }),
    expectedNiche: "food",
  },
  // ── TRAVEL ──
  {
    id: "travel-001", name: "WanderlustDiaries",
    source: makeSource({
      displayName: "Wanderlust Diaries", followers: 45000,
      bio: "Travel explorer sharing destinations, tips, and adventures. Official travel guides and photography presets available.",
      categories: ["travel"], links: ["https://wanderlustdiaries.com", "https://presets.wanderlust.com"],
      content: [
        makeItem("Hidden gems in Southeast Asia you must visit #travel #adventure #explore", { type: "travel" }),
        makeItem("Travel packing guide for long trips #travel #wanderlust #destination", { type: "guide" }),
        makeItem("Bali travel vlog - paradise found #travel #adventure #vacation", { type: "travel" }),
        makeItem("Budget travel tips for backpackers #travel #adventure #budget", { type: "guide" }),
        makeItem("Best travel photography spots in Europe #travel #photography", { type: "travel" }),
      ],
    }),
    expectedNiche: "travel",
  },
  {
    id: "travel-002", name: "LuxuryEscapes",
    source: makeSource({
      displayName: "Luxury Escapes Travel", followers: 15000,
      bio: "Luxury travel and premium resort experiences. Exclusive destinations for discerning travelers. Official luxury travel consultant.",
      categories: ["travel", "lifestyle"], links: ["https://luxuryescapes.com"],
      content: [
        makeItem("Top 5 luxury resorts in the Maldives #luxury #travel #exclusive", { type: "travel" }),
        makeItem("5-star hotel review: Ritz-Carlton Tokyo #luxury #travel #resort", { type: "review" }),
        makeItem("Private jet travel experience #luxury #premium #exclusive", { type: "travel" }),
        makeItem("Fine dining around the world - Michelin star restaurants #luxury", { type: "travel" }),
        makeItem("Luxury cruise review: Mediterranean voyage #luxury #travel #vacation", { type: "review" }),
      ],
    }),
    expectedNiche: "travel",
  },
  // ── MUSIC ──
  {
    id: "music-001", name: "MelodyQueen",
    source: makeSource({
      displayName: "Melody Queen", followers: 80000,
      bio: "Singer and songwriter sharing original music and covers. Official music store and merchandise available.",
      categories: ["music"], links: ["https://melodyqueen.com", "https://merch.melodyqueen.com"],
      content: [
        makeItem("New single out now on all platforms #music #song #singer", { type: "music" }),
        makeItem("Behind the scenes of my music video shoot #music #performance #artist", { type: "music" }),
        makeItem("Cover of 'Bohemian Rhapsody' - hope you enjoy! #music #song #singer", { type: "music" }),
        makeItem("My vocal warmup routine #singer #music #performance", { type: "music" }),
        makeItem("Studio vlog: recording my debut album #music #songwriter #artist", { type: "music" }),
      ],
    }),
    expectedNiche: "music",
  },
  {
    id: "music-002", name: "BeatMaster",
    source: makeSource({
      displayName: "Beat Master Pro", followers: 25000,
      bio: "Music producer creating beats and instrumentals. Official beat store and production services. Digital downloads available.",
      categories: ["music"], links: ["https://beatmaster.com", "https://store.beatmaster.com"],
      content: [
        makeItem("New beat pack - 10 trap beats for purchase #music #producer #beat", { type: "music" }),
        makeItem("Production tutorial: how to make a beat in FL Studio #music #production", { type: "tutorial" }),
        makeItem("Beat preview - melodic hip hop instrumental #music #producer #beat", { type: "music" }),
        makeItem("My studio setup tour #music #production #producer", { type: "music" }),
        makeItem("Top 5 VST plugins for music production #music #production #tools", { type: "review" }),
      ],
    }),
    expectedNiche: "music",
  },
  // ── ART ──
  {
    id: "art-001", name: "DigitalCanvas",
    source: makeSource({
      displayName: "Digital Canvas Art", followers: 18000,
      bio: "Digital artist creating stunning illustrations and 3D artwork. Official print store and commission work available.",
      categories: ["art"], links: ["https://digitalcanvas.com", "https://prints.digitalcanvas.com"],
      content: [
        makeItem("New digital illustration - fantasy landscape #digitalart #art #illustration", { type: "digital" }),
        makeItem("3D modeling timelapse - character design #digitalart #3d #artist", { type: "digital" }),
        makeItem("Speed painting video: 1 hour challenge #art #drawing #digital", { type: "digital" }),
        makeItem("My digital art workflow and tools #artist #digitalart #creative", { type: "digital" }),
        makeItem("NFT collection announcement - limited edition #digitalart #nft #art", { type: "digital" }),
      ],
    }),
    expectedNiche: "art",
  },
  {
    id: "art-002", name: "FineArtPrints",
    source: makeSource({
      displayName: "Fine Art Prints Studio", followers: 3000,
      bio: "Limited edition fine art prints and posters. Original artwork reproduced with care. Official print store.",
      categories: ["art"], links: ["https://fineartprints.com"],
      content: [
        makeItem("New limited edition print collection available now #print #art #fineart", { type: "promotional" }),
        makeItem("Behind the process: from canvas to print #art #poster #reproduction", { type: "educational" }),
        makeItem("Gallery exhibition preview - new collection #art #gallery #exhibition", { type: "promotional" }),
        makeItem("How to choose the perfect frame for your print #art #design", { type: "educational" }),
        makeItem("Artist spotlight: our featured collection #art #gallery", { type: "promotional" }),
      ],
    }),
    expectedNiche: "art",
  },
  // ── FASHION / LIFESTYLE ──
  {
    id: "lifestyle-001", name: "FarahKhan",
    source: makeSource({
      displayName: "Farah Khan", followers: 120000,
      bio: "Lifestyle creator and entertainer sharing daily routines, fashion, and inspiration. Official brand collaborations. Shop my picks.",
      categories: ["lifestyle", "entertainment"], links: ["https://farahkhan.com", "https://shop.farahkhan.com"],
      content: [
        makeItem("Daily routine vlog - a productive day in my life #lifestyle #daily #vlog", { type: "vlog" }),
        makeItem("Summer outfit ideas for every occasion #fashion #style #lifestyle", { type: "fashion" }),
        makeItem("Home decor haul - new additions to my space #lifestyle #home", { type: "lifestyle" }),
        makeItem("My skincare routine for glowing skin #beauty #lifestyle", { type: "beauty" }),
        makeItem("Weekend getaway vlog #lifestyle #travel #vlog", { type: "vlog" }),
      ],
    }),
    expectedNiche: "lifestyle",
  },
  {
    id: "lifestyle-002", name: "StyleIcon",
    source: makeSource({
      displayName: "Style Icon Official", followers: 120000,
      bio: "Fashion influencer and style expert. Outfit inspiration and trend analysis. Official brand ambassador.",
      categories: ["lifestyle", "fashion"], links: ["https://styleicon.com", "https://shop.styleicon.com"],
      content: [
        makeItem("Fall fashion trends 2024 - what to wear #fashion #style #outfit", { type: "fashion" }),
        makeItem("Lookbook: 5 outfits for work #fashion #style #lookbook", { type: "fashion" }),
        makeItem("Affordable luxury finds - budget friendly style #fashion #style", { type: "fashion" }),
        makeItem("Wardrobe essentials every woman needs #fashion #style #wardrobe", { type: "fashion" }),
        makeItem("Style tips: how to dress for your body type #fashion #style", { type: "fashion" }),
      ],
    }),
    expectedNiche: "lifestyle",
  },
  // ── SPORTS ──
  {
    id: "sports-001", name: "SpeedRunner",
    source: makeSource({
      displayName: "Speed Runner Official", followers: 200000,
      bio: "Professional athlete and competitor. Official training programs and branded merchandise available.",
      categories: ["sports"], links: ["https://speedrunner.com", "https://merch.speedrunner.com"],
      content: [
        makeItem("Training day vlog - getting ready for the championship #sports #training #athlete", { type: "training" }),
        makeItem("Race day preparation tips #sports #training #competition", { type: "training" }),
        makeItem("Behind the scenes at the Olympics trials #sports #athlete", { type: "sports" }),
        makeItem("Recovery routine after intense training #sports #fitness", { type: "training" }),
        makeItem("New merch collection drop - limited edition #sports #merch", { type: "promotional" }),
      ],
    }),
    expectedNiche: "sports",
  },
  {
    id: "sports-002", name: "TeamCoach",
    source: makeSource({
      displayName: "Team Coach Pro", followers: 8000,
      bio: "Professional sports coach offering training programs and coaching sessions. Official coaching academy.",
      categories: ["sports", "education"], links: ["https://teamcoach.com", "https://academy.teamcoach.com"],
      content: [
        makeItem("Drill of the week: improving agility #coach #training #sports", { type: "training" }),
        makeItem("Coaching philosophy: building a winning team #coach #training #drills", { type: "educational" }),
        makeItem("Training program for young athletes #coaching #sports #practice", { type: "training" }),
        makeItem("Game strategy analysis - how to read the opponent #coach #sports", { type: "educational" }),
        makeItem("Player development tips for coaches #training #coaching", { type: "training" }),
      ],
    }),
    expectedNiche: "sports",
  },
  // ── NEWS ──
  {
    id: "news-001", name: "DailyBrief",
    source: makeSource({
      displayName: "Daily Brief", followers: 10000,
      bio: "Curated daily newsletter covering tech, politics, and current affairs. Official subscription available.",
      categories: ["news"], links: ["https://dailybrief.com", "https://subscribe.dailybrief.com"],
      content: [
        makeItem("Today's top stories: election updates and market news #news #current #headline", { type: "news" }),
        makeItem("Weekly digest: AI regulation developments #news #currentaffairs", { type: "news" }),
        makeItem("Deep dive: the future of electric vehicles #news #report #analysis", { type: "news" }),
        makeItem("Morning briefing - start your day informed #news #daily #update", { type: "news" }),
        makeItem("Exclusive interview with industry leaders #news #journalism", { type: "news" }),
      ],
    }),
    expectedNiche: "news",
  },
  {
    id: "news-002", name: "DeepDiveNews",
    source: makeSource({
      displayName: "Deep Dive News", followers: 5000,
      bio: "Investigative journalism and in-depth reporting. Professional research and analysis. Official media publication.",
      categories: ["news"], links: ["https://deepdivenews.com"],
      content: [
        makeItem("Investigation: corporate tax avoidance exposed #news #investigation #reporting", { type: "news" }),
        makeItem("Exclusive report on climate policy changes #news #investigation #research", { type: "news" }),
        makeItem("Analysis: economic impact of new trade policies #news #analysis #data", { type: "news" }),
        makeItem("In-depth: healthcare system reforms #research #analysis #news", { type: "news" }),
        makeItem("Interview with whistleblower - full transcript #news #journalism", { type: "news" }),
      ],
    }),
    expectedNiche: "news",
  },
];

describe("AH-01: Alpha Hardening — Full Pipeline Validation", () => {
  const results: CreatorResult[] = [];

  beforeAll(() => {
    for (const creator of CREATORS) {
      const graph = knowledgeBuilder.build(creator.source);
      const match = personaEngine.detect(graph);
      const profile = profileBuilder.build(graph, match.persona, match.score);
      const context = planningEngine.build(graph, profile);
      const plan = planningEngineExp.plan(graph, profile);

      const issues: string[] = [];
      const scores: Record<string, number> = {};

      scores.import = rateImportQuality(graph, creator.source);
      scores.persona = ratePersonaAccuracy(match);
      scores.businessModel = rateBusinessModel(profile);
      scores.theme = rateThemeAccuracy(graph, creator.expectedNiche);
      scores.layout = rateLayoutQuality(plan);
      scores.navigation = rateNavigationQuality(plan);
      scores.cta = rateCTAQuality(plan);
      scores.storefront = rateStorefrontQuality(plan, graph, profile);
      scores.builder = rateBuilderQuality(plan, graph);
      scores.overall = +(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length).toFixed(1);

      if (graph.confidence < 0.3) issues.push(`Low KnowledgeGraph confidence: ${graph.confidence}`);
      if (match.score < 40) issues.push(`Low persona match score: ${match.score} for persona ${match.persona.name}`);
      if (!graph.brand.existingBranding && creator.source.links.length > 0) issues.push("Brand not detected despite links");
      if (plan.page.pageTypes.length === 0) issues.push("No page types defined");
      if (plan.sectionOrder.order.length <= 1) issues.push("Only 1 section in order — using defaults");

      results.push({
        id: creator.id, name: creator.name, niche: graph.creator.niche,
        graph, persona: { id: match.persona.id, name: match.persona.name, score: match.score },
        profile, context, plan, scores, issues,
      });
    }
  });

  it("generates valid KnowledgeGraph for all creators", () => {
    for (const r of results) {
      expect(r.graph.creator.name).toBeTruthy();
      expect(r.graph.creator.niche).toBeTruthy();
    }
  });

  it("detects correct niche for every creator", () => {
    for (const creator of CREATORS) {
      const r = results.find((x) => x.id === creator.id)!;
      expect(r.graph.creator.niche).toBe(creator.expectedNiche);
    }
  });

  it("assigns valid experience profile for all creators", () => {
    for (const r of results) {
      expect(r.profile.creatorStage).toBeDefined();
      expect(r.profile.businessModel).toBeDefined();
      expect(r.profile.brandStrength).toBeDefined();
    }
  });

  it("generates complete experience plan for all creators", () => {
    for (const r of results) {
      expect(r.plan.hero).toBeDefined();
      expect(r.plan.navigation).toBeDefined();
      expect(r.plan.cta).toBeDefined();
      expect(r.plan.footer).toBeDefined();
      expect(r.plan.sectionOrder.order.length).toBeGreaterThan(0);
      expect(r.plan.page.pageTypes.length).toBeGreaterThan(0);
    }
  });

  it("generates valid planning context for all creators", () => {
    for (const r of results) {
      expect(["none", "low", "medium", "high"]).toContain(r.context.authorityLevel);
      expect(["none", "low", "medium", "high"]).toContain(r.context.trustLevel);
      expect(["none", "low", "medium", "high"]).toContain(r.context.commerceReadiness);
    }
  });

  it("produces deterministic output across repeat runs", () => {
    for (const creator of CREATORS) {
      const g1 = knowledgeBuilder.build(creator.source);
      const g2 = knowledgeBuilder.build(creator.source);
      expect(g1.creator.niche).toBe(g2.creator.niche);
      expect(g1.theme.primary).toBe(g2.theme.primary);
      expect(g1.products.length).toBe(g2.products.length);
    }
  });

  it("scores table — all creators with per-category ratings", () => {
    console.log("\n=== AH-01 Quality Scores ===\n");
    const h = "| Creator | Niche | Persona | Import | BM | Theme | Layout | Nav | CTA | Store | Builder | Overall |";
    console.log(h);
    console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
    for (const r of results) {
      const s = r.scores;
      console.log(`| ${r.name.padEnd(20)} | ${r.niche.padEnd(12)} | ${String(s.persona).padStart(2)} | ${String(s.import).padStart(2)} | ${String(s.businessModel).padStart(2)} | ${String(s.theme).padStart(2)} | ${String(s.layout).padStart(2)} | ${String(s.navigation).padStart(2)} | ${String(s.cta).padStart(2)} | ${String(s.storefront).padStart(2)} | ${String(s.builder).padStart(2)} | ${String(s.overall).padStart(2)} |`);
    }
    console.log("\n--- Issue Summary ---");
    for (const r of results) {
      if (r.issues.length > 0) {
        for (const issue of r.issues) {
          console.log(`  [${r.name}] ${issue}`);
        }
      }
    }
    expect(results.length).toBe(CREATORS.length);
  });

  it("acceptable overall quality (average >= 6.0)", () => {
    const avg = results.reduce((a, r) => a + r.scores.overall, 0) / results.length;
    const avgRounded = Math.round(avg * 10) / 10;
    console.log(`\nAverage overall quality score: ${avgRounded}/10`);
    expect(avgRounded).toBeGreaterThanOrEqual(6.0);
  });

  it("no critical issues across all creators", () => {
    const critical: string[] = [];
    for (const r of results) {
      for (const issue of r.issues) {
        if (issue.startsWith("Low persona") || issue.startsWith("Low KnowledgeGraph")) {
          critical.push(`[${r.name}] ${issue}`);
        }
      }
    }
    expect(critical).toEqual([]);
  });
});

function rateImportQuality(graph: KnowledgeGraph, source: ContentSource): number {
  let score = 5;
  if (graph.creator.name) score += 1;
  if (graph.creator.bio) score += 1;
  if (source.links.length > 0 && graph.socialLinks.length > 0) score += 1;
  if (graph.creator.confidence > 0.5) score += 1;
  if (graph.products.length > 0) score += 1;
  return Math.min(score, 10);
}

function ratePersonaAccuracy(match: { score: number }): number {
  if (match.score >= 80) return 9;
  if (match.score >= 60) return 7;
  if (match.score >= 40) return 5;
  if (match.score >= 20) return 3;
  return 1;
}

function rateBusinessModel(profile: ExperienceProfile): number {
  let score = 6;
  if (profile.commerceStage !== "none") score += 1;
  if (profile.brandStrength !== "none") score += 1;
  if (profile.creatorStage !== "starting") score += 1;
  if (profile.confidence > 0.5) score += 1;
  return Math.min(score, 10);
}

function rateThemeAccuracy(graph: KnowledgeGraph, expectedNiche: string): number {
  const palettes: Record<string, string> = {
    gaming: "#7C3AED", education: "#3B82F6", finance: "#059669",
    fitness: "#EA580C", music: "#DB2777", travel: "#0EA5E9",
    food: "#D97706", photography: "#475569", technology: "#4F46E5",
    art: "#8B5CF6", lifestyle: "#EC4899", sports: "#2563EB",
    news: "#1E293B",
  };
  const expected = palettes[expectedNiche];
  if (!expected) return 5;
  if (graph.theme.primary === expected) return 10;
  if (Object.values(palettes).includes(graph.theme.primary)) return 7;
  return 5;
}

function rateLayoutQuality(plan: ExperiencePlan): number {
  let score = 5;
  if (plan.sectionOrder.order.length >= 3) score += 1;
  if (plan.sectionOrder.order.length >= 5) score += 1;
  if (plan.page.pageTypes.length >= 3) score += 1;
  if (plan.contentDensity !== "sparse") score += 1;
  if (plan.visualRhythm !== "calm") score += 1;
  return Math.min(score, 10);
}

function rateNavigationQuality(plan: ExperiencePlan): number {
  let score = 5;
  if (plan.navigation.sticky) score += 2;
  if (plan.navigation.searchEnabled) score += 1;
  if (plan.footer.showSocialLinks) score += 1;
  if (plan.footer.showBackToTop) score += 1;
  return Math.min(score, 10);
}

function rateCTAQuality(plan: ExperiencePlan): number {
  let score = 5;
  if (plan.cta.primaryStyle !== "none") score += 1;
  if (plan.cta.primarySize !== "sm") score += 1;
  if (plan.cta.secondaryVisible) score += 1;
  if (plan.cta.icon !== "none") score += 1;
  if (plan.conversionGoal.primary) score += 1;
  return Math.min(score, 10);
}

function rateStorefrontQuality(plan: ExperiencePlan, _graph: KnowledgeGraph, _profile: ExperienceProfile): number {
  let score = 5;
  if (plan.hero.variant !== "none") score += 1;
  if (plan.hero.showProfile) score += 1;
  if (plan.seo.priority === "high" || plan.seo.priority === "medium") score += 1;
  if (plan.seo.structuredData) score += 1;
  if (plan.mobilePriority === "high" || plan.mobilePriority === "medium") score += 1;
  return Math.min(score, 10);
}

function rateBuilderQuality(plan: ExperiencePlan, _graph: KnowledgeGraph): number {
  let score = 6;
  if (plan.theme.density) score += 1;
  if (plan.theme.cardStyle) score += 1;
  if (plan.theme.shadowDepth !== "flat") score += 1;
  if (plan.sectionOrder.order.length >= 4) score += 1;
  return Math.min(score, 10);
}
