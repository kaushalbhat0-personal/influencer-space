import type { PersonaDetector } from "./base";
import { createDetector } from "./base";
import type { PersonaId, BusinessModel, ContentStyle, AudienceType } from "../types";

const ids = (s: string) => s as PersonaId;
const bm = (s: BusinessModel) => s;
const cs = (s: ContentStyle) => s;
const at = (s: AudienceType) => s;

const bio = (g: { creator: { bio: string } }) => (g.creator.bio ?? "").toLowerCase();

export const ALL_DETECTORS: PersonaDetector[] = [

  // ──────────────────────────────────────────────
  // DEFAULT
  // ──────────────────────────────────────────────
  createDetector("default", {
    id: ids("default_creator"), name: "Creator",
    niche: "default", description: "General content creator starting their storefront journey",
    businessModel: bm("hybrid"), typicalProducts: ["Digital goods", "Merch"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.brand.existingBranding) s += 15;
    if (g.products.length >= 1) s += 15;
    s += 20;
    return s;
  }),

  createDetector("default", {
    id: ids("default_business"), name: "Business",
    niche: "default", description: "Established creator with strong brand presence and products",
    businessModel: bm("direct_sales"), typicalProducts: ["Branded products", "Services"],
    contentStyle: cs("promotional"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.products.length >= 3 && g.brand.existingBranding) s += 50;
    if (g.audience.interests.some(i => i.toLowerCase().includes("business"))) s += 20;
    if (g.content.topContentTypes.includes("promotional")) s += 15;
    if (g.content.contentQuality === "high") s += 10;
    return s;
  }),

  createDetector("default", {
    id: ids("default_portfolio"), name: "Portfolio",
    niche: "default", description: "Visual creator showcasing work with minimal commerce focus",
    businessModel: bm("content_monetization"), typicalProducts: [],
    contentStyle: cs("inspirational"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.products.length === 0 && g.content.contentQuality === "high") s += 40;
    if (g.content.topContentTypes.some(t => ["photography", "art", "design"].includes(t))) s += 25;
    if (g.socialLinks.length >= 2) s += 15;
    s += 10;
    return s;
  }),

  createDetector("default", {
    id: ids("default_minimal"), name: "Minimal",
    niche: "default", description: "Creator with minimal content and no products yet",
    businessModel: bm("content_monetization"), typicalProducts: [],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "low", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.products.length === 0 && g.content.contentQuality === "low") s += 40;
    if (g.audience.interests.length <= 3) s += 20;
    if (!g.brand.existingBranding) s += 15;
    s += 15;
    return s;
  }),

  // ──────────────────────────────────────────────
  // EDUCATION
  // ──────────────────────────────────────────────
  createDetector("education", {
    id: ids("education_course_creator"), name: "Course Creator",
    niche: "education", description: "Sells structured courses and educational content",
    businessModel: bm("education"), typicalProducts: ["Courses", "Workbooks", "Templates"],
    contentStyle: cs("educational"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "faq"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.products.length >= 2 && g.products.some(p => p.type === "digital")) s += 40;
    if (g.content.topContentTypes.some(t => ["educational", "tutorial", "how to"].includes(t))) s += 30;
    if (g.content.commonHashtags.some(h => ["#educational", "#tutorial", "#course", "#learn", "#study"].includes(h))) s += 15;
    if (bio(g).match(/course|teach|learn|curriculum/)) s += 20;
    if (g.audience.interests.some(i => i.toLowerCase().includes("learn"))) s += 10;
    return s;
  }),

  createDetector("education", {
    id: ids("education_coach"), name: "Coach",
    niche: "education", description: "Offers one-on-one coaching and mentoring services",
    businessModel: bm("service_based"), typicalProducts: ["Coaching sessions", "Workshops"],
    contentStyle: cs("inspirational"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "about", "products", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.businessModel.type === "services") s += 30;
    if ((g.products.length <= 2 || g.products.length === 0)) s += 20;
    if (bio(g).match(/coach|mentor|guide|transform/)) s += 25;
    if (g.audience.interests.some(i => i.toLowerCase().includes("development") || i.toLowerCase().includes("growth"))) s += 15;
    if (g.brand.brandVoice === "inspirational") s += 10;
    return s;
  }),

  createDetector("education", {
    id: ids("education_consultant"), name: "Consultant",
    niche: "education", description: "Professional consultant offering strategy and advisory services",
    businessModel: bm("service_based"), typicalProducts: ["Consulting", "Strategy sessions"],
    contentStyle: cs("educational"), audienceType: at("professional"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "about", "products", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.businessModel.type === "services" && g.creator.followers > 5000) s += 30;
    if (g.content.topContentTypes.some(t => ["professional", "analysis", "strategy"].includes(t))) s += 25;
    if (bio(g).match(/consult|strategy|business|advisory/)) s += 20;
    if (g.audience.interests.some(i => i.toLowerCase().includes("business") || i.toLowerCase().includes("professional"))) s += 15;
    if (g.brand.brandVoice === "professional") s += 10;
    return s;
  }),

  createDetector("education", {
    id: ids("education_teacher"), name: "Teacher",
    niche: "education", description: "Dedicated educator sharing knowledge through structured lessons",
    businessModel: bm("education"), typicalProducts: ["Lessons", "Resources", "Worksheets"],
    contentStyle: cs("educational"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "products", "about", "faq"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.content.topContentTypes.some(t => ["educational", "tutorial", "lesson"].includes(t))) s += 35;
    if (g.content.commonHashtags.some(h => ["#educational", "#tutorial", "#lesson", "#study", "#class"].includes(h))) s += 15;
    if (g.products.length <= 1) s += 20;
    if (bio(g).match(/teacher|educator|professor|instructor/)) s += 20;
    if (g.content.contentQuality === "high") s += 10;
    if (g.brand.brandVoice === "educational") s += 15;
    return s;
  }),

  createDetector("education", {
    id: ids("education_mentor"), name: "Mentor",
    niche: "education", description: "Guide and mentor focused on personal and professional development",
    businessModel: bm("community"), typicalProducts: ["Mentorship", "Community access"],
    contentStyle: cs("inspirational"), audienceType: at("community"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "about", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.audience.interests.some(i => i.toLowerCase().includes("mentorship") || i.toLowerCase().includes("growth") || i.toLowerCase().includes("development"))) s += 30;
    if (g.socialLinks.length >= 3) s += 20;
    if (bio(g).match(/mentor|help|guide|empower/)) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    if (g.brand.brandVoice === "inspirational") s += 15;
    return s;
  }),

  createDetector("education", {
    id: ids("education_community_builder"), name: "Community Builder",
    niche: "education", description: "Builds engaged learning communities and discussion groups",
    businessModel: bm("community"), typicalProducts: ["Community membership", "Events"],
    contentStyle: cs("educational"), audienceType: at("community"),
    socialProofEmphasis: "high", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "social_links", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.socialLinks.length >= 4) s += 35;
    if (g.content.topContentTypes.some(t => ["discussion", "community", "q&a"].includes(t))) s += 25;
    if (g.audience.interests.some(i => i.toLowerCase().includes("community") || i.toLowerCase().includes("networking"))) s += 20;
    if (g.creator.followers > 10000) s += 10;
    s += 10;
    return s;
  }),

  createDetector("education", {
    id: ids("education_academy"), name: "Academy",
    niche: "education", description: "Full-scale educational platform with multiple structured programs",
    businessModel: bm("education"), typicalProducts: ["Programs", "Certifications", "Bootcamps"],
    contentStyle: cs("educational"), audienceType: at("professional"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "products", "about", "faq", "testimonials"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.products.length >= 3) s += 40;
    if (g.businessModel.type === "digital_products") s += 30;
    if (bio(g).match(/academy|institute|school|university|coaching|preparation/)) s += 25;
    if (g.content.contentQuality === "high") s += 10;
    return s;
  }),

  // ──────────────────────────────────────────────
  // GAMING
  // ──────────────────────────────────────────────
  createDetector("gaming", {
    id: ids("gaming_streamer"), name: "Streamer",
    niche: "gaming", description: "Live streamer focused on gameplay and entertainment",
    businessModel: bm("content_monetization"), typicalProducts: ["Merch", "Subscriptions"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "social_links", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.content.topContentTypes.some(t => ["stream", "live", "gameplay"].includes(t))) s += 35;
    if (g.content.commonHashtags.some(h => ["#stream", "#live", "#gameplay", "#twitch"].includes(h))) s += 15;
    if (g.content.contentQuality === "high") s += 20;
    if (g.creator.followers > 5000) s += 15;
    if (g.socialLinks.length >= 3) s += 15;
    s += 10;
    return s;
  }),

  createDetector("gaming", {
    id: ids("gaming_esports"), name: "Esports Player",
    niche: "gaming", description: "Competitive esports athlete with team affiliations",
    businessModel: bm("direct_sales"), typicalProducts: ["Branded merch", "Coaching"],
    contentStyle: cs("entertainment"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "gallery", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.creator.followers > 100000) s += 40;
    if (g.content.topContentTypes.some(t => ["competitive", "esports", "tournament"].includes(t))) s += 25;
    if (g.content.commonHashtags.some(h => ["#esports", "#competitive", "#tournament"].includes(h))) s += 15;
    if (bio(g).match(/esports|competitive|pro|team/)) s += 20;
    if (g.products.length >= 1) s += 15;
    return s;
  }),

  createDetector("gaming", {
    id: ids("gaming_guide_creator"), name: "Guide Creator",
    niche: "gaming", description: "Creates tutorials, guides, and walkthroughs for games",
    businessModel: bm("education"), typicalProducts: ["Guides", "Walkthroughs", "Courses"],
    contentStyle: cs("educational"), audienceType: at("niche"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.content.topContentTypes.some(t => ["tutorial", "guide", "walkthrough", "how to"].includes(t))) s += 40;
    if (g.content.commonHashtags.some(h => ["#guide", "#tutorial", "#walkthrough", "#tips"].includes(h))) s += 15;
    if (bio(g).match(/guide|tutorial|walkthrough|tips/)) s += 25;
    if (g.products.length >= 1) s += 20;
    s += 10;
    return s;
  }),

  createDetector("gaming", {
    id: ids("gaming_challenge_creator"), name: "Challenge Creator",
    niche: "gaming", description: "Creates gaming challenges, speedruns, and unique content",
    businessModel: bm("content_monetization"), typicalProducts: ["Merch", "Donations"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.content.topContentTypes.some(t => ["challenge", "speedrun", "funny", "montage"].includes(t))) s += 35;
    if (g.content.commonHashtags.some(h => ["#challenge", "#speedrun", "#montage", "#funny"].includes(h))) s += 15;
    if (g.content.contentQuality === "high") s += 20;
    if (g.creator.followers > 10000) s += 20;
    if (g.socialLinks.length >= 2) s += 15;
    s += 10;
    return s;
  }),

  createDetector("gaming", {
    id: ids("gaming_entertainment"), name: "Entertainment Creator",
    niche: "gaming", description: "Focuses on entertaining gaming content and variety streams",
    businessModel: bm("content_monetization"), typicalProducts: ["Merch"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "social_links", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.content.topContentTypes.some(t => ["entertainment", "funny", "variety"].includes(t))) s += 30;
    if (g.content.commonHashtags.some(h => ["#entertainment", "#funny", "#gaming"].includes(h))) s += 15;
    if (g.creator.followers > 5000) s += 20;
    if (g.socialLinks.length >= 2) s += 20;
    if (g.products.length === 0) s += 15;
    s += 10;
    return s;
  }),

  createDetector("gaming", {
    id: ids("gaming_community_leader"), name: "Community Leader",
    niche: "gaming", description: "Builds and manages gaming communities across platforms",
    businessModel: bm("community"), typicalProducts: ["Community access", "Events"],
    contentStyle: cs("entertainment"), audienceType: at("community"),
    socialProofEmphasis: "high", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "social_links", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.socialLinks.length >= 4) s += 35;
    if (g.creator.followers > 10000) s += 25;
    if (bio(g).match(/community|discord|clan|server/)) s += 20;
    if (g.audience.interests.some(i => i.toLowerCase().includes("community"))) s += 10;
    s += 10;
    return s;
  }),

  // ──────────────────────────────────────────────
  // PHOTOGRAPHY
  // ──────────────────────────────────────────────
  createDetector("photography", {
    id: ids("photography_wedding"), name: "Wedding Photographer",
    niche: "photography", description: "Specializes in wedding and event photography",
    businessModel: bm("service_based"), typicalProducts: ["Wedding packages", "Prints"],
    contentStyle: cs("storytelling"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "gallery", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/wedding|bride|groom|engagement/)) s += 45;
    if (g.audience.interests.some(i => i.toLowerCase().includes("wedding") || i.toLowerCase().includes("event"))) s += 20;
    if (g.products.length >= 1 && g.products.some(p => p.type === "service")) s += 20;
    if (g.content.contentQuality === "high") s += 10;
    s += 5;
    return s;
  }),

  createDetector("photography", {
    id: ids("photography_portrait"), name: "Portrait Photographer",
    niche: "photography", description: "Specializes in portrait and headshot photography",
    businessModel: bm("service_based"), typicalProducts: ["Portrait sessions", "Headshots"],
    contentStyle: cs("storytelling"), audienceType: at("professional"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/portrait|headshot|posing/)) s += 40;
    if (g.content.topContentTypes.some(t => ["portrait", "people"].includes(t))) s += 25;
    if (g.audience.interests.some(i => i.toLowerCase().includes("portrait") || i.toLowerCase().includes("photography"))) s += 15;
    if (g.content.contentQuality === "high") s += 10;
    s += 10;
    return s;
  }),

  createDetector("photography", {
    id: ids("photography_nature"), name: "Nature Photographer",
    niche: "photography", description: "Captures landscapes, wildlife, and nature scenes",
    businessModel: bm("direct_sales"), typicalProducts: ["Prints", "Presets", "Workshops"],
    contentStyle: cs("inspirational"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "gallery", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/nature|landscape|wildlife|outdoor/)) s += 40;
    if (g.content.topContentTypes.some(t => ["landscape", "nature", "wildlife"].includes(t))) s += 25;
    if (g.products.length >= 1) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("photography", {
    id: ids("photography_travel"), name: "Travel Photographer",
    niche: "photography", description: "Documents travels and destinations through photography",
    businessModel: bm("content_monetization"), typicalProducts: ["Prints", "Presets", "Guides"],
    contentStyle: cs("storytelling"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "gallery", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/travel|wanderlust|destination|adventure/)) s += 35;
    if (g.content.topContentTypes.some(t => ["travel", "wanderlust", "destination"].includes(t))) s += 25;
    if (g.products.length >= 1) s += 15;
    if (g.socialLinks.length >= 3) s += 15;
    s += 10;
    return s;
  }),

  createDetector("photography", {
    id: ids("photography_commercial"), name: "Commercial Photographer",
    niche: "photography", description: "Creates product and commercial photography for brands",
    businessModel: bm("service_based"), typicalProducts: ["Product shoots", "Brand campaigns"],
    contentStyle: cs("technical"), audienceType: at("professional"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "gallery", "products", "about", "testimonials"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/commercial|product|brand|advertising/)) s += 40;
    if (g.audience.interests.some(i => i.toLowerCase().includes("business") || i.toLowerCase().includes("commercial"))) s += 20;
    if (g.products.length >= 1) s += 20;
    if (g.brand.brandVoice === "professional") s += 10;
    s += 10;
    return s;
  }),

  createDetector("photography", {
    id: ids("photography_print_seller"), name: "Print Seller",
    niche: "photography", description: "Sells fine art prints and photographic reproductions",
    businessModel: bm("direct_sales"), typicalProducts: ["Fine art prints", "Framed prints"],
    contentStyle: cs("inspirational"), audienceType: at("luxury"),
    socialProofEmphasis: "medium", pricingEmphasis: "high",
    defaultModules: ["hero", "gallery", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.products.length >= 3) s += 40;
    if (bio(g).match(/print|fine art|gallery|limited edition/)) s += 25;
    if (g.content.contentQuality === "high") s += 20;
    if (g.brand.existingBranding) s += 15;
    return s;
  }),

  // ──────────────────────────────────────────────
  // TECHNOLOGY
  // ──────────────────────────────────────────────
  createDetector("technology", {
    id: ids("tech_saas_founder"), name: "SaaS Founder",
    niche: "technology", description: "Builds and sells software-as-a-service products",
    businessModel: bm("direct_sales"), typicalProducts: ["SaaS subscriptions", "API access"],
    contentStyle: cs("technical"), audienceType: at("professional"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "products", "about", "faq", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.products.length >= 1 && g.products.some(p => p.type === "subscription")) s += 40;
    if (bio(g).match(/saas|software|platform|startup/)) s += 25;
    if (g.audience.interests.some(i => i.toLowerCase().includes("business") || i.toLowerCase().includes("software"))) s += 20;
    if (g.brand.existingBranding) s += 15;
    return s;
  }),

  createDetector("technology", {
    id: ids("tech_developer"), name: "Developer",
    niche: "technology", description: "Creates code, libraries, and developer tools",
    businessModel: bm("education"), typicalProducts: ["Code templates", "Courses", "Tools"],
    contentStyle: cs("technical"), audienceType: at("niche"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/developer|engineer|coding|programming|open source/)) s += 35;
    if (g.content.topContentTypes.some(t => ["coding", "programming", "technical", "tutorial"].includes(t))) s += 25;
    if (g.products.length >= 1 && g.products.some(p => p.type === "digital")) s += 20;
    if (g.audience.interests.some(i => i.toLowerCase().includes("technology") || i.toLowerCase().includes("coding"))) s += 10;
    s += 10;
    return s;
  }),

  createDetector("technology", {
    id: ids("tech_agency"), name: "Agency",
    niche: "technology", description: "Runs a digital agency offering development and design services",
    businessModel: bm("service_based"), typicalProducts: ["Web development", "Design services"],
    contentStyle: cs("technical"), audienceType: at("professional"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "products", "testimonials", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.businessModel.type === "services") s += 30;
    if (bio(g).match(/agency|studio|firm|solutions/)) s += 25;
    if (g.products.length >= 2) s += 20;
    if (g.audience.interests.some(i => i.toLowerCase().includes("business"))) s += 15;
    if (g.brand.brandVoice === "professional") s += 10;
    return s;
  }),

  createDetector("technology", {
    id: ids("tech_freelancer"), name: "Freelancer",
    niche: "technology", description: "Independent professional offering technical services",
    businessModel: bm("service_based"), typicalProducts: ["Consulting", "Development"],
    contentStyle: cs("technical"), audienceType: at("professional"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "about", "products", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/freelance|independent|consultant/)) s += 35;
    if (g.products.length <= 2) s += 25;
    if (g.content.topContentTypes.some(t => ["technical", "tutorial", "portfolio"].includes(t))) s += 20;
    if (g.content.contentQuality === "high") s += 10;
    s += 10;
    return s;
  }),

  createDetector("technology", {
    id: ids("tech_educator"), name: "Educator",
    niche: "technology", description: "Teaches technology skills through courses and content",
    businessModel: bm("education"), typicalProducts: ["Courses", "Workshops", "Templates"],
    contentStyle: cs("educational"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "faq"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.content.topContentTypes.some(t => ["educational", "tutorial", "course"].includes(t))) s += 35;
    if (bio(g).match(/teach|course|learn|training/)) s += 25;
    if (g.products.length >= 2) s += 20;
    if (g.creator.followers > 5000) s += 10;
    s += 10;
    return s;
  }),

  createDetector("technology", {
    id: ids("tech_template_creator"), name: "Template Creator",
    niche: "technology", description: "Creates and sells templates, themes, and design assets",
    businessModel: bm("direct_sales"), typicalProducts: ["Templates", "Themes", "Assets"],
    contentStyle: cs("technical"), audienceType: at("niche"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.products.length >= 3) s += 40;
    if (bio(g).match(/template|theme|asset|design/)) s += 25;
    if (g.content.topContentTypes.some(t => ["design", "tutorial", "template"].includes(t))) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("technology", {
    id: ids("tech_open_source"), name: "Open Source Maintainer",
    niche: "technology", description: "Maintains open source projects and developer communities",
    businessModel: bm("community"), typicalProducts: ["Sponsorships", "Consulting"],
    contentStyle: cs("technical"), audienceType: at("community"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "social_links", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/open source|contributor|maintainer/)) s += 40;
    if (g.socialLinks.length >= 3) s += 20;
    if (g.creator.followers > 5000) s += 15;
    if (g.products.length === 0) s += 15;
    s += 10;
    return s;
  }),

  // ──────────────────────────────────────────────
  // FITNESS
  // ──────────────────────────────────────────────
  createDetector("fitness", {
    id: ids("fitness_personal_trainer"), name: "Personal Trainer",
    niche: "fitness", description: "Offers personal training sessions and workout programs",
    businessModel: bm("service_based"), typicalProducts: ["Training sessions", "Workout plans"],
    contentStyle: cs("educational"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/personal trainer|fitness coach|training/)) s += 35;
    if (g.products.length >= 1 && g.products.some(p => p.type === "service")) s += 25;
    if (g.content.topContentTypes.some(t => ["workout", "exercise", "training"].includes(t))) s += 20;
    if (g.audience.interests.some(i => i.toLowerCase().includes("fitness") || i.toLowerCase().includes("workout"))) s += 10;
    s += 10;
    return s;
  }),

  createDetector("fitness", {
    id: ids("fitness_online_coach"), name: "Online Coach",
    niche: "fitness", description: "Provides remote coaching and digital fitness programs",
    businessModel: bm("education"), typicalProducts: ["Online programs", "Coaching app"],
    contentStyle: cs("inspirational"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/online coach|remote|digital program/)) s += 35;
    if (g.products.length >= 2) s += 25;
    if (g.content.topContentTypes.some(t => ["educational", "motivation", "transformation"].includes(t))) s += 20;
    if (g.creator.followers > 10000) s += 10;
    s += 10;
    return s;
  }),

  createDetector("fitness", {
    id: ids("fitness_nutrition_coach"), name: "Nutrition Coach",
    niche: "fitness", description: "Specializes in nutrition planning and dietary guidance",
    businessModel: bm("service_based"), typicalProducts: ["Meal plans", "Nutrition coaching"],
    contentStyle: cs("educational"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "faq", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/nutrition|diet|meal plan|nutritionist/)) s += 45;
    if (g.audience.interests.some(i => i.toLowerCase().includes("nutrition") || i.toLowerCase().includes("health") || i.toLowerCase().includes("diet"))) s += 20;
    if (g.products.length >= 1) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("fitness", {
    id: ids("fitness_yoga_teacher"), name: "Yoga Teacher",
    niche: "fitness", description: "Teaches yoga, meditation, and mindfulness practices",
    businessModel: bm("service_based"), typicalProducts: ["Yoga classes", "Meditation guides"],
    contentStyle: cs("inspirational"), audienceType: at("community"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "about", "products", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/yoga|meditation|mindfulness|asana/)) s += 45;
    if (g.content.topContentTypes.some(t => ["yoga", "meditation", "wellness"].includes(t))) s += 25;
    if (g.audience.interests.some(i => i.toLowerCase().includes("yoga") || i.toLowerCase().includes("meditation"))) s += 15;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("fitness", {
    id: ids("fitness_gym"), name: "Gym",
    niche: "fitness", description: "Owns or operates a physical fitness facility",
    businessModel: bm("direct_sales"), typicalProducts: ["Memberships", "Merch"],
    contentStyle: cs("promotional"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "gallery", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/gym|studio|facility|fitness center/)) s += 40;
    if (g.products.length >= 2) s += 25;
    if (g.brand.existingBranding) s += 20;
    s += 15;
    return s;
  }),

  createDetector("fitness", {
    id: ids("fitness_community_coach"), name: "Community Coach",
    niche: "fitness", description: "Builds fitness communities and group challenge programs",
    businessModel: bm("community"), typicalProducts: ["Community access", "Challenges"],
    contentStyle: cs("inspirational"), audienceType: at("community"),
    socialProofEmphasis: "high", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "testimonials", "social_links"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.socialLinks.length >= 3) s += 30;
    if (bio(g).match(/community|challenge|group|together/)) s += 25;
    if (g.content.topContentTypes.some(t => ["challenge", "group", "community"].includes(t))) s += 20;
    if (g.creator.followers > 5000) s += 15;
    s += 10;
    return s;
  }),

  // ──────────────────────────────────────────────
  // FOOD
  // ──────────────────────────────────────────────
  createDetector("food", {
    id: ids("food_recipe_creator"), name: "Recipe Creator",
    niche: "food", description: "Creates and shares original recipes and cooking content",
    businessModel: bm("content_monetization"), typicalProducts: ["Recipe books", "Cooking courses"],
    contentStyle: cs("educational"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "products", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/recipe|cook|bake|kitchen|delicious/)) s += 35;
    if (g.content.topContentTypes.some(t => ["recipe", "cooking", "baking"].includes(t))) s += 25;
    if (g.products.length >= 1) s += 20;
    if (g.content.contentQuality === "high") s += 10;
    s += 10;
    return s;
  }),

  createDetector("food", {
    id: ids("food_restaurant"), name: "Restaurant",
    niche: "food", description: "Owns or operates a restaurant or food service business",
    businessModel: bm("direct_sales"), typicalProducts: ["Menu items", "Catering"],
    contentStyle: cs("promotional"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/restaurant|cafe|bistro|eatery/)) s += 45;
    if (g.brand.existingBranding) s += 25;
    if (g.products.length >= 2) s += 20;
    s += 10;
    return s;
  }),

  createDetector("food", {
    id: ids("food_home_chef"), name: "Home Chef",
    niche: "food", description: "Home cook sharing family recipes and cooking tips",
    businessModel: bm("content_monetization"), typicalProducts: ["Digital recipe cards"],
    contentStyle: cs("storytelling"), audienceType: at("general"),
    socialProofEmphasis: "low", pricingEmphasis: "low",
    defaultModules: ["hero", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/home cook|family recipe|homemade/)) s += 40;
    if (g.products.length === 0) s += 20;
    if (g.content.topContentTypes.some(t => ["cooking", "food", "recipe"].includes(t))) s += 20;
    if (g.content.contentQuality === "high") s += 10;
    s += 10;
    return s;
  }),

  createDetector("food", {
    id: ids("food_baker"), name: "Baker",
    niche: "food", description: "Specializes in baking and pastry creation",
    businessModel: bm("direct_sales"), typicalProducts: ["Baked goods", "Decorating kits"],
    contentStyle: cs("inspirational"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/bake|bakery|pastry|bread|cake/)) s += 45;
    if (g.content.topContentTypes.some(t => ["baking", "dessert", "cake"].includes(t))) s += 25;
    if (g.products.length >= 1) s += 20;
    s += 10;
    return s;
  }),

  createDetector("food", {
    id: ids("food_blogger"), name: "Food Blogger",
    niche: "food", description: "Reviews food, restaurants, and shares culinary experiences",
    businessModel: bm("content_monetization"), typicalProducts: ["Guides", "Reviews"],
    contentStyle: cs("storytelling"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "gallery", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/food blogger|review|taste|dining|restaurant review/)) s += 35;
    if (g.socialLinks.length >= 3) s += 20;
    if (g.content.topContentTypes.some(t => ["review", "food", "dining"].includes(t))) s += 20;
    if (g.creator.followers > 5000) s += 15;
    s += 10;
    return s;
  }),

  // ──────────────────────────────────────────────
  // TRAVEL
  // ──────────────────────────────────────────────
  createDetector("travel", {
    id: ids("travel_explorer"), name: "Explorer",
    niche: "travel", description: "Adventurous traveler sharing destinations and experiences",
    businessModel: bm("content_monetization"), typicalProducts: ["Travel guides", "Presets"],
    contentStyle: cs("storytelling"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "gallery", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/explore|adventure|destination|travel/)) s += 35;
    if (g.content.topContentTypes.some(t => ["travel", "adventure", "exploration"].includes(t))) s += 25;
    if (g.socialLinks.length >= 2) s += 15;
    if (g.content.contentQuality === "high") s += 15;
    s += 10;
    return s;
  }),

  createDetector("travel", {
    id: ids("travel_luxury"), name: "Luxury Travel",
    niche: "travel", description: "Focuses on luxury travel, resorts, and high-end experiences",
    businessModel: bm("content_monetization"), typicalProducts: ["Luxury guides", "Concierge"],
    contentStyle: cs("inspirational"), audienceType: at("luxury"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/luxury|exclusive|resort|5-star|premium/)) s += 45;
    if (g.audience.interests.some(i => i.toLowerCase().includes("luxury") || i.toLowerCase().includes("travel"))) s += 20;
    if (g.content.contentQuality === "high") s += 20;
    if (g.brand.existingBranding) s += 15;
    return s;
  }),

  createDetector("travel", {
    id: ids("travel_adventure_guide"), name: "Adventure Guide",
    niche: "travel", description: "Leads adventure trips and outdoor expeditions",
    businessModel: bm("service_based"), typicalProducts: ["Guided trips", "Gear"],
    contentStyle: cs("storytelling"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "products", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/adventure guide|expedition|trek|outdoor/)) s += 40;
    if (g.products.length >= 1 && g.products.some(p => p.type === "service")) s += 25;
    if (g.content.topContentTypes.some(t => ["adventure", "outdoor", "hiking"].includes(t))) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("travel", {
    id: ids("travel_family"), name: "Family Travel",
    niche: "travel", description: "Travels with family and shares family-friendly destinations",
    businessModel: bm("content_monetization"), typicalProducts: ["Family guides", "Itineraries"],
    contentStyle: cs("storytelling"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/family|kids|parents|family travel/)) s += 45;
    if (g.audience.interests.some(i => i.toLowerCase().includes("family") || i.toLowerCase().includes("parenting"))) s += 25;
    if (g.products.length >= 1) s += 15;
    s += 15;
    return s;
  }),

  createDetector("travel", {
    id: ids("travel_digital_nomad"), name: "Digital Nomad",
    niche: "travel", description: "Works remotely while traveling the world",
    businessModel: bm("content_monetization"), typicalProducts: ["Nomad guides", "Workspaces"],
    contentStyle: cs("inspirational"), audienceType: at("community"),
    socialProofEmphasis: "high", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "gallery", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/digital nomad|remote work|work from anywhere/)) s += 40;
    if (g.socialLinks.length >= 3) s += 20;
    if (g.content.topContentTypes.some(t => ["remote work", "nomad", "coworking"].includes(t))) s += 20;
    if (g.creator.followers > 5000) s += 10;
    s += 10;
    return s;
  }),

  // ──────────────────────────────────────────────
  // MUSIC
  // ──────────────────────────────────────────────
  createDetector("music", {
    id: ids("music_singer"), name: "Singer",
    niche: "music", description: "Vocal artist performing and releasing music",
    businessModel: bm("content_monetization"), typicalProducts: ["Music", "Merch", "Tickets"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/singer|vocalist|songwriter|artist/)) s += 40;
    if (g.products.length >= 1) s += 25;
    if (g.content.topContentTypes.some(t => ["music", "song", "performance"].includes(t))) s += 20;
    if (g.creator.followers > 10000) s += 15;
    return s;
  }),

  createDetector("music", {
    id: ids("music_producer"), name: "Producer",
    niche: "music", description: "Creates beats, instrumentals, and produces music for others",
    businessModel: bm("direct_sales"), typicalProducts: ["Beats", "Production services"],
    contentStyle: cs("technical"), audienceType: at("professional"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/producer|beat|instrumental|producing/)) s += 40;
    if (g.products.length >= 2 && g.products.some(p => p.type === "digital")) s += 25;
    if (g.content.topContentTypes.some(t => ["music", "production", "beat"].includes(t))) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("music", {
    id: ids("music_dj"), name: "DJ",
    niche: "music", description: "Performs as a DJ at events and clubs",
    businessModel: bm("service_based"), typicalProducts: ["DJ sets", "Booking"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "about", "gallery", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/dj|disc jockey|mix|club dj/)) s += 45;
    if (g.audience.interests.some(i => i.toLowerCase().includes("music") || i.toLowerCase().includes("party") || i.toLowerCase().includes("nightlife"))) s += 25;
    if (g.creator.followers > 5000) s += 15;
    s += 15;
    return s;
  }),

  createDetector("music", {
    id: ids("music_band"), name: "Band",
    niche: "music", description: "Musical group performing and releasing together",
    businessModel: bm("direct_sales"), typicalProducts: ["Albums", "Merch", "Tickets"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/band|group|ensemble|orchestra/)) s += 40;
    if (g.products.length >= 2) s += 25;
    if (g.socialLinks.length >= 3) s += 20;
    if (g.creator.followers > 10000) s += 15;
    return s;
  }),

  createDetector("music", {
    id: ids("music_composer"), name: "Composer",
    niche: "music", description: "Creates original compositions for media and performances",
    businessModel: bm("service_based"), typicalProducts: ["Compositions", "Scoring"],
    contentStyle: cs("technical"), audienceType: at("professional"),
    socialProofEmphasis: "medium", pricingEmphasis: "high",
    defaultModules: ["hero", "about", "products", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/composer|composition|orchestrate|score/)) s += 45;
    if (g.audience.interests.some(i => i.toLowerCase().includes("music") || i.toLowerCase().includes("composition"))) s += 20;
    if (g.products.length >= 1) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  // ──────────────────────────────────────────────
  // ART
  // ──────────────────────────────────────────────
  createDetector("art", {
    id: ids("art_illustrator"), name: "Illustrator",
    niche: "art", description: "Creates illustrations for books, media, and products",
    businessModel: bm("direct_sales"), typicalProducts: ["Prints", "Commissions", "Digital art"],
    contentStyle: cs("inspirational"), audienceType: at("niche"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "gallery", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/illustrator|illustration|drawing/)) s += 40;
    if (g.content.topContentTypes.some(t => ["illustration", "drawing", "sketch"].includes(t))) s += 25;
    if (g.products.length >= 1) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("art", {
    id: ids("art_painter"), name: "Painter",
    niche: "art", description: "Creates original paintings and fine art works",
    businessModel: bm("direct_sales"), typicalProducts: ["Original paintings", "Prints"],
    contentStyle: cs("inspirational"), audienceType: at("luxury"),
    socialProofEmphasis: "medium", pricingEmphasis: "high",
    defaultModules: ["hero", "gallery", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/painter|painting|canvas|oil|watercolor/)) s += 45;
    if (g.content.topContentTypes.some(t => ["painting", "art", "studio"].includes(t))) s += 25;
    if (g.products.length >= 2) s += 15;
    s += 15;
    return s;
  }),

  createDetector("art", {
    id: ids("art_digital_artist"), name: "Digital Artist",
    niche: "art", description: "Creates digital art, NFTs, and multimedia works",
    businessModel: bm("direct_sales"), typicalProducts: ["Digital art", "NFTs", "Prints"],
    contentStyle: cs("technical"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "gallery", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/digital artist|digital art|nft|3d/)) s += 40;
    if (g.content.topContentTypes.some(t => ["digital", "3d", "animation", "nft"].includes(t))) s += 25;
    if (g.products.length >= 1) s += 20;
    if (g.creator.followers > 5000) s += 15;
    return s;
  }),

  createDetector("art", {
    id: ids("art_commission_artist"), name: "Commission Artist",
    niche: "art", description: "Accepts custom commissions and personalized artwork orders",
    businessModel: bm("service_based"), typicalProducts: ["Commissions", "Custom pieces"],
    contentStyle: cs("behind_the_scenes"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "gallery", "about", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/commission|custom order|request/)) s += 40;
    if (g.products.length === 0) s += 25;
    if (g.creator.followers < 10000) s += 20;
    if (g.content.topContentTypes.some(t => ["commission", "custom", "process"].includes(t))) s += 15;
    return s;
  }),

  createDetector("art", {
    id: ids("art_gallery_artist"), name: "Gallery Artist",
    niche: "art", description: "Exhibits work in galleries and sells through art dealers",
    businessModel: bm("direct_sales"), typicalProducts: ["Exhibition pieces", "Limited editions"],
    contentStyle: cs("inspirational"), audienceType: at("luxury"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/gallery|exhibition|art show|featured/)) s += 40;
    if (g.creator.followers > 10000) s += 25;
    if (g.content.contentQuality === "high") s += 20;
    if (g.brand.existingBranding) s += 15;
    return s;
  }),

  createDetector("art", {
    id: ids("art_print_seller"), name: "Print Seller",
    niche: "art", description: "Sells reproductions and prints of original artwork",
    businessModel: bm("direct_sales"), typicalProducts: ["Prints", "Posters", "Framed art"],
    contentStyle: cs("promotional"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.products.length >= 3) s += 45;
    if (bio(g).match(/print|poster|reproduction|giclée/)) s += 25;
    if (g.content.contentQuality === "high") s += 15;
    s += 15;
    return s;
  }),

  // ──────────────────────────────────────────────
  // FASHION / LIFESTYLE
  // ──────────────────────────────────────────────
  createDetector("lifestyle", {
    id: ids("fashion_influencer"), name: "Fashion Influencer",
    niche: "lifestyle", description: "Fashion and style influencer showcasing outfits and trends",
    businessModel: bm("content_monetization"), typicalProducts: ["Style guides", "Affiliate"],
    contentStyle: cs("inspirational"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "low",
    defaultModules: ["hero", "gallery", "about", "social_links"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/fashion|style|outfit|trendy|wardrobe/)) s += 35;
    if (g.content.topContentTypes.some(t => ["fashion", "style", "outfit", "lookbook"].includes(t))) s += 25;
    if (g.creator.followers > 10000) s += 20;
    if (g.socialLinks.length >= 3) s += 10;
    s += 10;
    return s;
  }),

  createDetector("lifestyle", {
    id: ids("fashion_designer"), name: "Fashion Designer",
    niche: "lifestyle", description: "Creates and sells original clothing and accessory designs",
    businessModel: bm("direct_sales"), typicalProducts: ["Clothing", "Accessories", "Collections"],
    contentStyle: cs("storytelling"), audienceType: at("luxury"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "products", "gallery", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/designer|fashion design|collection|couture/)) s += 40;
    if (g.products.length >= 2) s += 25;
    if (g.brand.existingBranding) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("lifestyle", {
    id: ids("fashion_stylist"), name: "Stylist",
    niche: "lifestyle", description: "Professional stylist offering personal styling services",
    businessModel: bm("service_based"), typicalProducts: ["Styling sessions", "Wardrobe audits"],
    contentStyle: cs("educational"), audienceType: at("professional"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "about", "gallery", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/stylist|personal stylist|wardrobe|image consultant/)) s += 45;
    if (g.audience.interests.some(i => i.toLowerCase().includes("fashion") || i.toLowerCase().includes("style"))) s += 20;
    if (g.products.length <= 1) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("lifestyle", {
    id: ids("fashion_brand"), name: "Fashion Brand",
    niche: "lifestyle", description: "Owns a fashion or lifestyle brand with product lines",
    businessModel: bm("direct_sales"), typicalProducts: ["Collections", "Branded goods"],
    contentStyle: cs("promotional"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "products", "about", "gallery", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.products.length >= 4 && g.brand.existingBranding) s += 45;
    if (bio(g).match(/brand|label|house|collection/)) s += 20;
    if (g.creator.followers > 10000) s += 15;
    if (g.brand.brandVoice === "professional") s += 10;
    s += 10;
    return s;
  }),

  createDetector("lifestyle", {
    id: ids("lifestyle_creator"), name: "Lifestyle Creator",
    niche: "lifestyle", description: "Shares daily life, routines, and lifestyle content",
    businessModel: bm("content_monetization"), typicalProducts: ["Digital products", "Merch"],
    contentStyle: cs("behind_the_scenes"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "gallery", "social_links"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/lifestyle|daily|vlog|routine|life/)) s += 35;
    if (g.content.topContentTypes.some(t => ["lifestyle", "daily", "vlog", "routine"].includes(t))) s += 25;
    if (g.socialLinks.length >= 2) s += 15;
    if (g.creator.followers > 5000) s += 15;
    s += 10;
    return s;
  }),

  createDetector("lifestyle", {
    id: ids("beauty_influencer"), name: "Beauty Influencer",
    niche: "lifestyle", description: "Beauty and makeup content creator with tutorials and reviews",
    businessModel: bm("content_monetization"), typicalProducts: ["Beauty guides", "Brand collabs"],
    contentStyle: cs("educational"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "gallery", "about", "products", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/beauty|makeup|skincare|cosmetic|tutorial/)) s += 40;
    if (g.content.topContentTypes.some(t => ["beauty", "makeup", "skincare", "tutorial"].includes(t))) s += 25;
    if (g.creator.followers > 10000) s += 20;
    if (g.audience.interests.some(i => i.toLowerCase().includes("beauty") || i.toLowerCase().includes("makeup"))) s += 15;
    return s;
  }),

  // ──────────────────────────────────────────────
  // SPORTS
  // ──────────────────────────────────────────────
  createDetector("sports", {
    id: ids("sports_athlete"), name: "Athlete",
    niche: "sports", description: "Professional or competitive athlete with a personal brand",
    businessModel: bm("direct_sales"), typicalProducts: ["Merch", "Training programs"],
    contentStyle: cs("inspirational"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "gallery", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/athlete|player|sports|competitor/)) s += 35;
    if (g.products.length >= 1) s += 25;
    if (g.creator.followers > 10000) s += 20;
    if (g.content.topContentTypes.some(t => ["sports", "training", "competition"].includes(t))) s += 10;
    s += 10;
    return s;
  }),

  createDetector("sports", {
    id: ids("sports_coach"), name: "Sports Coach",
    niche: "sports", description: "Coaches athletes and teams in specific sports",
    businessModel: bm("service_based"), typicalProducts: ["Coaching", "Training plans"],
    contentStyle: cs("educational"), audienceType: at("niche"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/coach|training|drill|practice/)) s += 40;
    if (g.products.length >= 1 && g.products.some(p => p.type === "service")) s += 25;
    if (g.content.topContentTypes.some(t => ["training", "coaching", "drills"].includes(t))) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("sports", {
    id: ids("sports_academy"), name: "Sports Academy",
    niche: "sports", description: "Runs a sports academy or training facility",
    businessModel: bm("education"), typicalProducts: ["Programs", "Camps", "Memberships"],
    contentStyle: cs("educational"), audienceType: at("community"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "products", "about", "gallery", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/academy|camp|facility|center/)) s += 40;
    if (g.products.length >= 3) s += 25;
    if (g.brand.existingBranding) s += 20;
    if (g.creator.followers > 5000) s += 15;
    return s;
  }),

  createDetector("sports", {
    id: ids("sports_content_creator"), name: "Sports Content Creator",
    niche: "sports", description: "Creates sports commentary, analysis, and entertainment content",
    businessModel: bm("content_monetization"), typicalProducts: ["Merch", "Subscriptions"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "social_links", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/sports|commentary|analysis|highlights/)) s += 35;
    if (g.content.topContentTypes.some(t => ["sports", "commentary", "analysis", "highlights"].includes(t))) s += 25;
    if (g.creator.followers > 5000) s += 20;
    if (g.socialLinks.length >= 2) s += 10;
    s += 10;
    return s;
  }),

  // ──────────────────────────────────────────────
  // NEWS
  // ──────────────────────────────────────────────
  createDetector("news", {
    id: ids("news_journalist"), name: "Journalist",
    niche: "news", description: "Reports news stories and investigative journalism",
    businessModel: bm("content_monetization"), typicalProducts: ["Articles", "Investigations"],
    contentStyle: cs("educational"), audienceType: at("professional"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/journalist|reporter|correspondent|investigative/)) s += 40;
    if (g.content.topContentTypes.some(t => ["news", "investigation", "reporting"].includes(t))) s += 25;
    if (g.audience.interests.some(i => i.toLowerCase().includes("news") || i.toLowerCase().includes("politics") || i.toLowerCase().includes("current"))) s += 20;
    if (g.creator.followers > 5000) s += 15;
    return s;
  }),

  createDetector("news", {
    id: ids("news_newsletter"), name: "Newsletter",
    niche: "news", description: "Runs a curated newsletter on specific topics",
    businessModel: bm("content_monetization"), typicalProducts: ["Subscriptions", "Sponsorships"],
    contentStyle: cs("educational"), audienceType: at("niche"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "about", "products", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/newsletter|curated|digest|weekly/)) s += 40;
    if (g.products.length >= 1 && g.products.some(p => p.type === "subscription")) s += 25;
    if (g.audience.interests.some(i => i.toLowerCase().includes("news") || i.toLowerCase().includes("current affairs"))) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    return s;
  }),

  createDetector("news", {
    id: ids("news_researcher"), name: "Researcher",
    niche: "news", description: "Publishes in-depth research and analysis on specialized topics",
    businessModel: bm("education"), typicalProducts: ["Reports", "Analysis", "Data"],
    contentStyle: cs("technical"), audienceType: at("professional"),
    socialProofEmphasis: "medium", pricingEmphasis: "high",
    defaultModules: ["hero", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/research|analysis|report|data/)) s += 40;
    if (g.products.length >= 2) s += 25;
    if (g.audience.interests.some(i => i.toLowerCase().includes("research") || i.toLowerCase().includes("data") || i.toLowerCase().includes("analysis"))) s += 20;
    if (g.brand.brandVoice === "professional") s += 15;
    return s;
  }),

  createDetector("news", {
    id: ids("news_media"), name: "Media",
    niche: "news", description: "Runs a media outlet or news platform",
    businessModel: bm("content_monetization"), typicalProducts: ["Content", "Ad space"],
    contentStyle: cs("educational"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "about", "products", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/media|outlet|publication|platform/)) s += 40;
    if (g.products.length >= 2) s += 25;
    if (g.socialLinks.length >= 3) s += 15;
    if (g.creator.followers > 10000) s += 10;
    s += 10;
    return s;
  }),

  // ──────────────────────────────────────────────
  // FINANCE
  // ──────────────────────────────────────────────
  createDetector("finance", {
    id: ids("finance_educator"), name: "Finance Educator",
    niche: "finance", description: "Educates audiences on personal finance, investing, and wealth building",
    businessModel: bm("education"), typicalProducts: ["Courses", "Guides", "Templates"],
    contentStyle: cs("educational"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "faq", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.content.topContentTypes.some(t => ["educational", "tutorial", "guide", "analysis"].includes(t))) s += 30;
    if (bio(g).match(/finance|invest|money|budget|saving|wealth|financial/)) s += 30;
    if (g.products.length >= 1 && g.products.some(p => p.type === "digital")) s += 20;
    if (g.audience.interests.some(i => i.toLowerCase().includes("education") || i.toLowerCase().includes("business"))) s += 10;
    s += 10;
    return s;
  }),

  createDetector("finance", {
    id: ids("finance_advisor"), name: "Financial Advisor",
    niche: "finance", description: "Professional financial advisor offering consultation and wealth management services",
    businessModel: bm("service_based"), typicalProducts: ["Consultation", "Wealth management", "Planning"],
    contentStyle: cs("educational"), audienceType: at("professional"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "about", "products", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.businessModel.type === "services" && g.creator.followers > 5000) s += 30;
    if (bio(g).match(/advisor|consultant|advisory|wealth|portfolio|expert/)) s += 30;
    if (g.content.topContentTypes.some(t => ["professional", "analysis", "strategy"].includes(t))) s += 15;
    if (g.audience.interests.some(i => i.toLowerCase().includes("business"))) s += 15;
    if (g.brand.brandVoice === "professional") s += 10;
    return s;
  }),

  createDetector("finance", {
    id: ids("finance_investor"), name: "Investor",
    niche: "finance", description: "Shares investment strategies, market analysis, and trading insights",
    businessModel: bm("education"), typicalProducts: ["Investment guides", "Market reports", "Courses"],
    contentStyle: cs("technical"), audienceType: at("niche"),
    socialProofEmphasis: "medium", pricingEmphasis: "medium",
    defaultModules: ["hero", "products", "about", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/investor|trading|stock|crypto|market|portfolio/)) s += 35;
    if (g.content.topContentTypes.some(t => ["analysis", "technical", "report", "strategy"].includes(t))) s += 20;
    if (g.products.length >= 2) s += 20;
    if (g.content.contentQuality === "high") s += 15;
    s += 10;
    return s;
  }),

  // ──────────────────────────────────────────────
  // COMEDY
  // ──────────────────────────────────────────────
  createDetector("comedy", {
    id: ids("comedy_standup"), name: "Standup Comedian",
    niche: "comedy", description: "Performs standup comedy and live comedy shows",
    businessModel: bm("service_based"), typicalProducts: ["Show tickets", "Merch", "Premium content"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "medium",
    defaultModules: ["hero", "about", "products", "gallery", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.content.topContentTypes.some(t => ["comedy", "entertainment", "funny", "sketch"].includes(t))) s += 30;
    if (g.content.commonHashtags.some(h => ["#comedy", "#funny", "#sketch", "#standup", "#comedian", "#humor", "#joke"].includes(h))) s += 15;
    if (bio(g).match(/comedy|standup|comedian|laugh|funny|humor|joke|roast/)) s += 30;
    if (g.creator.followers > 50000) s += 20;
    if (g.products.length >= 1) s += 10;
    s += 10;
    return s;
  }),

  createDetector("comedy", {
    id: ids("comedy_sketch_creator"), name: "Sketch Creator",
    niche: "comedy", description: "Creates comedy sketches, parody, and satirical content",
    businessModel: bm("content_monetization"), typicalProducts: ["Merch", "Channel memberships"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "medium", pricingEmphasis: "low",
    defaultModules: ["hero", "about", "social_links", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (bio(g).match(/sketch|parody|satire|character|impression/)) s += 35;
    if (g.content.topContentTypes.some(t => ["sketch", "parody", "satire", "comedy"].includes(t))) s += 25;
    if (g.content.commonHashtags.some(h => ["#sketch", "#comedy", "#parody", "#satire"].includes(h))) s += 15;
    if (g.socialLinks.length >= 3) s += 20;
    if (g.creator.followers > 10000) s += 10;
    s += 10;
    return s;
  }),

  // ──────────────────────────────────────────────
  // CELEBRITY
  // ──────────────────────────────────────────────
  createDetector("celebrity", {
    id: ids("celebrity_influencer"), name: "Celebrity Influencer",
    niche: "celebrity", description: "High-profile celebrity with massive brand presence and influence",
    businessModel: bm("hybrid"), typicalProducts: ["Branded merchandise", "Exclusive content", "Brand deals"],
    contentStyle: cs("entertainment"), audienceType: at("general"),
    socialProofEmphasis: "high", pricingEmphasis: "high",
    defaultModules: ["hero", "products", "about", "gallery", "testimonials", "contact"], onboardingDefaults: {},
  }, g => {
    let s = 0;
    if (g.creator.followers > 500000) s += 30;
    if (g.creator.followers > 100000) s += 20;
    if (g.creator.followers >= 50000) s += 15;
    if (g.creator.followers >= 10000) s += 10;
    if (g.brand.existingBranding) s += 20;
    if (g.content.commonHashtags.some(h => ["#celebrity", "#bollywood", "#star", "#famous"].includes(h))) s += 15;
    if (bio(g).match(/celebrity|star|icon|bollywood|legend/)) s += 15;
    if (g.products.length >= 3) s += 15;
    if (g.brand.brandVoice === "professional") s += 10;
    s += 5;
    return s;
  }),

];
