import { BaseVariantStrategy } from "./base";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";

// ─── DEFAULT ───────────────────────────────────────────────

class DefaultCreatorVariant extends BaseVariantStrategy {
  readonly id = "default_creator"; readonly niche = "default"; readonly label = "Creator"; readonly description = "Generic creator store";
  match(_g: KnowledgeGraph) { void _g; return 1; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(`${g.creator.name}'s Store`, g.brand.tagline || "", "Shop Now"), ...this.products(g), ...this.contentFeed(g), ...this.about(g.creator.name), ...this.social(g), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class DefaultBusinessVariant extends BaseVariantStrategy {
  readonly id = "default_business"; readonly niche = "default"; readonly label = "Business"; readonly description = "Business-focused storefront";
  match(g: KnowledgeGraph) { return g.products.length >= 3 ? 2 : (g.brand.existingBranding ? 1.5 : 0); }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "", "Shop Now", "left"), ...this.products(g, "Products", 6), ...this.productGrid(g), ...this.about(g.creator.name), ...this.testimonial(), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class DefaultMinimalVariant extends BaseVariantStrategy {
  readonly id = "default_minimal"; readonly niche = "default"; readonly label = "Minimal"; readonly description = "Minimal single-page storefront";
  match(g: KnowledgeGraph) { return g.products.length === 0 && g.content.contentQuality !== "high" ? 2 : 0.5; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.creator.bio?.slice(0, 80) || "", "Get Started"), ...this.about(g.creator.name), ...this.social(g), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class DefaultPortfolioVariant extends BaseVariantStrategy {
  readonly id = "default_portfolio"; readonly niche = "default"; readonly label = "Portfolio"; readonly description = "Portfolio-focused storefront";
  match(g: KnowledgeGraph) { return g.content.contentQuality === "high" && g.content.topContentTypes.length > 0 ? 2 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.creator.bio?.slice(0, 100) || "", "View Work"), ...this.contentFeed(g), ...this.gallery("Portfolio"), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

// ─── PHOTOGRAPHY ──────────────────────────────────────────

class PhotographyPortfolioVariant extends BaseVariantStrategy {
  readonly id = "photo_portfolio"; readonly niche = "photography"; readonly label = "Portfolio"; readonly description = "Clean portfolio for photographers with no products";
  match(g: KnowledgeGraph) { return g.products.length === 0 ? 3 : (g.products.length < 5 ? 1 : 0); }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "Capturing moments", "View Portfolio", "center"), ...this.gallery("Portfolio"), ...this.about(g.creator.name), ...this.contact(), ...this.social(g), ...this.footer(g.creator.name)];
  }
}

class PhotographyEditorialVariant extends BaseVariantStrategy {
  readonly id = "photo_editorial"; readonly niche = "photography"; readonly label = "Editorial"; readonly description = "Story-driven layout with content feed";
  match(g: KnowledgeGraph) { return g.content.topContentTypes.length > 0 && g.content.contentQuality === "high" ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, "Visual storytelling", "Read Stories"), ...this.contentFeed(g), ...this.gallery("Editorial"), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class PhotographyCommerceVariant extends BaseVariantStrategy {
  readonly id = "photo_commerce"; readonly niche = "photography"; readonly label = "Commerce"; readonly description = "Print shop with storefront";
  match(g: KnowledgeGraph) { return g.products.length >= 5 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "Shop prints and presets", "Shop Prints"), ...this.products(g, "Prints & Presets"), ...this.gallery("Portfolio"), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

// ─── EDUCATION ────────────────────────────────────────────

class EducationCourseFirstVariant extends BaseVariantStrategy {
  readonly id = "edu_courses"; readonly niche = "education"; readonly label = "Course First"; readonly description = "Course-focused marketplace";
  match(g: KnowledgeGraph) { return g.products.length >= 2 ? 3 : (g.products.length === 1 ? 2 : 0); }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(`Learn with ${g.creator.name}`, g.brand.tagline || "Master new skills", "Browse Courses", "left"), ...this.products(g, "Featured Courses"), ...this.testimonial(), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class EducationCommunityVariant extends BaseVariantStrategy {
  readonly id = "edu_community"; readonly niche = "education"; readonly label = "Community"; readonly description = "Community-driven learning platform";
  match(g: KnowledgeGraph) { return g.socialLinks.length >= 3 || g.creator.followers > 50000 ? 2.5 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(`Join ${g.creator.name}'s Community`, "Learn together", "Join Free"), ...this.contentFeed(g), ...this.products(g, "Premium Content"), ...this.social(g), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

// ─── GAMING ───────────────────────────────────────────────

class GamingStreamerVariant extends BaseVariantStrategy {
  readonly id = "gaming_streamer"; readonly niche = "gaming"; readonly label = "Streamer"; readonly description = "Streamer-focused layout with content first";
  match(g: KnowledgeGraph) { return g.creator.contentFrequency === "daily" && g.content.topContentTypes.length > 0 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, "Live now — join the stream", "Watch Now"), ...this.contentFeed(g), ...this.products(g, "Stream Gear"), ...this.social(g), ...this.about(g.creator.name), ...this.footer(g.creator.name)];
  }
}

class GamingEsportsVariant extends BaseVariantStrategy {
  readonly id = "gaming_esports"; readonly niche = "gaming"; readonly label = "Esports"; readonly description = "Competitive gaming layout with stats";
  match(g: KnowledgeGraph) { return g.creator.followers > 100000 ? 2.5 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, "Competitive gaming at its finest", "Follow Season"), ...this.stats(), ...this.products(g, "Team Gear"), ...this.contentFeed(g), ...this.about(g.creator.name), ...this.footer(g.creator.name)];
  }
}

class GamingStoreVariant extends BaseVariantStrategy {
  readonly id = "gaming_store"; readonly niche = "gaming"; readonly label = "Creator Store"; readonly description = "Merch-focused store for gaming creators";
  match(g: KnowledgeGraph) { return g.products.length >= 3 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, "Exclusive gaming merch", "Shop Merch"), ...this.products(g, "Merch"), ...this.productGrid(g), ...this.contentFeed(g), ...this.about(g.creator.name), ...this.footer(g.creator.name)];
  }
}

// ─── TECHNOLOGY ───────────────────────────────────────────

class TechProductVariant extends BaseVariantStrategy {
  readonly id = "tech_product"; readonly niche = "technology"; readonly label = "Product"; readonly description = "SaaS/product-focused layout";
  match(g: KnowledgeGraph) { return g.products.length >= 2 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "Build better tools", "See Products"), ...this.products(g, "Featured Tools"), ...this.productGrid(g), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class TechMarketplaceVariant extends BaseVariantStrategy {
  readonly id = "tech_marketplace"; readonly niche = "technology"; readonly label = "Template Marketplace"; readonly description = "Template/digital asset marketplace";
  match(g: KnowledgeGraph) { return g.products.length >= 5 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, "Templates and tools for builders", "Browse Templates"), ...this.products(g, "Templates", 8), ...this.productGrid(g), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

// ─── FITNESS ──────────────────────────────────────────────

class FitnessTransformationVariant extends BaseVariantStrategy {
  readonly id = "fit_transformation"; readonly niche = "fitness"; readonly label = "Transformation"; readonly description = "Results-focused fitness layout";
  match(g: KnowledgeGraph) { return g.content.contentQuality === "high" && g.content.topContentTypes.includes("video") ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(`Transform with ${g.creator.name}`, "Real results, real programs", "Start Now"), ...this.stats(), ...this.testimonial(), ...this.products(g, "Programs"), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class FitnessProgramsVariant extends BaseVariantStrategy {
  readonly id = "fit_programs"; readonly niche = "fitness"; readonly label = "Programs"; readonly description = "Program-first fitness layout";
  match(g: KnowledgeGraph) { return g.products.length >= 2 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "Science-backed training", "Shop Programs"), ...this.products(g, "Programs"), ...this.about(g.creator.name), ...this.testimonial(), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

// ─── FOOD ─────────────────────────────────────────────────

class FoodRecipesVariant extends BaseVariantStrategy {
  readonly id = "food_recipes"; readonly niche = "food"; readonly label = "Recipes"; readonly description = "Recipe-first food layout";
  match(g: KnowledgeGraph) { return g.creator.contentFrequency === "daily" && g.content.topContentTypes.length > 0 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(`Cook with ${g.creator.name}`, "Simple, delicious recipes", "Browse Recipes"), ...this.contentFeed(g), ...this.gallery("Food Gallery"), ...this.products(g, "Recipe Books"), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class FoodCommerceVariant extends BaseVariantStrategy {
  readonly id = "food_commerce"; readonly niche = "food"; readonly label = "Commerce"; readonly description = "Food product storefront";
  match(g: KnowledgeGraph) { return g.products.length >= 3 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "From kitchen to table", "Shop Now"), ...this.products(g, "Products", 6), ...this.gallery("Gallery"), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

// ─── MUSIC ────────────────────────────────────────────────

class MusicArtistVariant extends BaseVariantStrategy {
  readonly id = "music_artist"; readonly niche = "music"; readonly label = "Artist"; readonly description = "Artist profile with releases";
  match(g: KnowledgeGraph) { return g.products.length >= 1 ? 3 : (g.content.topContentTypes.length > 0 ? 2 : 0); }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "Latest music and merch", "Listen Now"), ...this.products(g, "Latest Release", 1), ...this.contentFeed(g), ...this.about(g.creator.name), ...this.gallery("Photos"), ...this.social(g), ...this.footer(g.creator.name)];
  }
}

class MusicMerchVariant extends BaseVariantStrategy {
  readonly id = "music_merch"; readonly niche = "music"; readonly label = "Merch"; readonly description = "Merch-first music store";
  match(g: KnowledgeGraph) { return g.products.length >= 3 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, "Official merch store", "Shop Merch"), ...this.products(g, "Merch"), ...this.productGrid(g), ...this.about(g.creator.name), ...this.gallery("Gallery"), ...this.footer(g.creator.name)];
  }
}

// ─── TRAVEL ───────────────────────────────────────────────

class TravelExplorerVariant extends BaseVariantStrategy {
  readonly id = "travel_explorer"; readonly niche = "travel"; readonly label = "Explorer"; readonly description = "Adventure travel blog layout";
  match(g: KnowledgeGraph) { return g.content.contentQuality === "high" ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(`Explore with ${g.creator.name}`, "Discover amazing places", "Explore"), ...this.gallery("Destinations"), ...this.contentFeed(g), ...this.products(g, "Travel Guides"), ...this.about(g.creator.name), ...this.social(g), ...this.footer(g.creator.name)];
  }
}

class TravelGuideVariant extends BaseVariantStrategy {
  readonly id = "travel_guide"; readonly niche = "travel"; readonly label = "Guide"; readonly description = "Travel guide marketplace";
  match(g: KnowledgeGraph) { return g.products.length >= 2 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "Curated travel guides", "Get Guides"), ...this.products(g, "Guides"), ...this.gallery("Destinations"), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

// ─── LIFESTYLE / FASHION ──────────────────────────────────

class FashionLookbookVariant extends BaseVariantStrategy {
  readonly id = "fash_lookbook"; readonly niche = "lifestyle"; readonly label = "Lookbook"; readonly description = "Visual lookbook layout";
  match(g: KnowledgeGraph) { return g.content.contentQuality === "high" && g.products.length < 3 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, "Style inspiration daily", "View Lookbook"), ...this.gallery("Lookbook"), ...this.contentFeed(g), ...this.social(g), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class FashionCommerceVariant extends BaseVariantStrategy {
  readonly id = "fash_commerce"; readonly niche = "lifestyle"; readonly label = "Commerce"; readonly description = "Fashion storefront";
  match(g: KnowledgeGraph) { return g.products.length >= 3 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "Curated collections", "Shop Collection"), ...this.products(g, "Collections"), ...this.gallery("Lookbook"), ...this.about(g.creator.name), ...this.social(g), ...this.footer(g.creator.name)];
  }
}

// ─── ART ──────────────────────────────────────────────────

class ArtPortfolioVariant extends BaseVariantStrategy {
  readonly id = "art_portfolio"; readonly niche = "art"; readonly label = "Portfolio"; readonly description = "Artist portfolio";
  match(g: KnowledgeGraph) { return g.products.length === 0 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "Original artwork", "View Gallery"), ...this.gallery("Portfolio"), ...this.about(g.creator.name), ...this.contact(), ...this.social(g), ...this.footer(g.creator.name)];
  }
}

class ArtCommissionsVariant extends BaseVariantStrategy {
  readonly id = "art_commissions"; readonly niche = "art"; readonly label = "Commissions"; readonly description = "Commission-focused art store";
  match(g: KnowledgeGraph) { return g.products.length === 0 && g.creator.followers < 10000 ? 2 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, "Custom art created for you", "Commission Me"), ...this.gallery("Portfolio"), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class ArtPrintShopVariant extends BaseVariantStrategy {
  readonly id = "art_prints"; readonly niche = "art"; readonly label = "Print Shop"; readonly description = "Print-on-demand art store";
  match(g: KnowledgeGraph) { return g.products.length >= 2 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, "Limited edition prints", "Shop Prints"), ...this.products(g, "Prints"), ...this.gallery("Collection"), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

// ─── SPORTS ───────────────────────────────────────────────

class SportsAthleteVariant extends BaseVariantStrategy {
  readonly id = "sports_athlete"; readonly niche = "sports"; readonly label = "Athlete"; readonly description = "Athlete profile and merch";
  match(g: KnowledgeGraph) { return g.products.length >= 1 ? 2 : 1; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "Train harder, go further", "Shop Gear"), ...this.products(g, "Gear"), ...this.stats(), ...this.contentFeed(g), ...this.about(g.creator.name), ...this.social(g), ...this.footer(g.creator.name)];
  }
}

class SportsTrainingVariant extends BaseVariantStrategy {
  readonly id = "sports_training"; readonly niche = "sports"; readonly label = "Training"; readonly description = "Training program store";
  match(g: KnowledgeGraph) { return g.products.length >= 2 ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(`Train with ${g.creator.name}`, g.brand.tagline || "Proven training programs", "Start Training"), ...this.products(g, "Programs"), ...this.testimonial(), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

// ─── NEWS ─────────────────────────────────────────────────

class NewsMagazineVariant extends BaseVariantStrategy {
  readonly id = "news_magazine"; readonly niche = "news"; readonly label = "Magazine"; readonly description = "Magazine-style news layout";
  match(g: KnowledgeGraph) { return g.creator.contentFrequency === "daily" ? 3 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, "Latest stories and analysis", "Read More", "left"), ...this.contentFeed(g), ...this.about(g.creator.name), ...this.social(g), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

class NewsNewsletterVariant extends BaseVariantStrategy {
  readonly id = "news_newsletter"; readonly niche = "news"; readonly label = "Newsletter"; readonly description = "Newsletter subscription layout";
  match(g: KnowledgeGraph) { return g.products.length >= 1 ? 2 : 0; }
  composeSections(g: KnowledgeGraph) {
    return [this.hero(g.creator.name, g.brand.tagline || "Stay informed", "Subscribe"), ...this.products(g, "Subscriptions"), ...this.contentFeed(g), ...this.about(g.creator.name), ...this.contact(), ...this.footer(g.creator.name)];
  }
}

// ─── COLLECTION ───────────────────────────────────────────

export const ALL_VARIANTS: BaseVariantStrategy[] = [
  // Default
  new DefaultCreatorVariant(), new DefaultBusinessVariant(), new DefaultMinimalVariant(), new DefaultPortfolioVariant(),
  // Photography
  new PhotographyPortfolioVariant(), new PhotographyEditorialVariant(), new PhotographyCommerceVariant(),
  // Education
  new EducationCourseFirstVariant(), new EducationCommunityVariant(),
  // Gaming
  new GamingStreamerVariant(), new GamingEsportsVariant(), new GamingStoreVariant(),
  // Technology
  new TechProductVariant(), new TechMarketplaceVariant(),
  // Fitness
  new FitnessTransformationVariant(), new FitnessProgramsVariant(),
  // Food
  new FoodRecipesVariant(), new FoodCommerceVariant(),
  // Music
  new MusicArtistVariant(), new MusicMerchVariant(),
  // Travel
  new TravelExplorerVariant(), new TravelGuideVariant(),
  // Fashion / Lifestyle
  new FashionLookbookVariant(), new FashionCommerceVariant(),
  // Art
  new ArtPortfolioVariant(), new ArtCommissionsVariant(), new ArtPrintShopVariant(),
  // Sports
  new SportsAthleteVariant(), new SportsTrainingVariant(),
  // News
  new NewsMagazineVariant(), new NewsNewsletterVariant(),
];
