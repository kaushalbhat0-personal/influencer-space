import type { ContentSource, KnowledgeGraph, BusinessModelIntelligence } from "./types";
import { ContentAnalyzer } from "./content-analyzer";
import { CreatorProfiler } from "./creator-profiler";
import { NicheDetector } from "./niche-detector";
import { AudienceProfiler } from "./audience-profiler";
import { BrandExtractor } from "./brand-extractor";
import { SocialGraph } from "./social-graph";
import { ContentClassifier } from "./content-classifier";
import { KeywordExtractor } from "./keyword-extractor";
import { SEOGenerator } from "./seo-generator";
import { ProductRecommender } from "./product-recommender";
import { SectionRecommender } from "./section-recommender";
import { ThemeSelector } from "./theme-selector";

export class KnowledgeBuilder {
  private contentAnalyzer: ContentAnalyzer;
  private nicheDetector: NicheDetector;
  private creatorProfiler: CreatorProfiler;
  private audienceProfiler: AudienceProfiler;
  private brandExtractor: BrandExtractor;
  private socialGraph: SocialGraph;
  private contentClassifier: ContentClassifier;
  private keywordExtractor: KeywordExtractor;
  private seoGenerator: SEOGenerator;
  private productRecommender: ProductRecommender;
  private sectionRecommender: SectionRecommender;
  private themeSelector: ThemeSelector;

  constructor() {
    this.nicheDetector = new NicheDetector();
    this.contentAnalyzer = new ContentAnalyzer();
    this.creatorProfiler = new CreatorProfiler(this.nicheDetector);
    this.audienceProfiler = new AudienceProfiler();
    this.brandExtractor = new BrandExtractor();
    this.socialGraph = new SocialGraph();
    this.contentClassifier = new ContentClassifier(this.nicheDetector);
    this.keywordExtractor = new KeywordExtractor(this.contentAnalyzer);
    this.seoGenerator = new SEOGenerator(this.nicheDetector, this.keywordExtractor, this.creatorProfiler);
    this.productRecommender = new ProductRecommender(this.nicheDetector);
    this.sectionRecommender = new SectionRecommender(this.nicheDetector, this.creatorProfiler);
    this.themeSelector = new ThemeSelector(this.nicheDetector, this.brandExtractor);
  }

  build(source: ContentSource): KnowledgeGraph {
    const creator = this.creatorProfiler.profile(source);
    const brand = this.brandExtractor.extract(source);
    const audience = this.audienceProfiler.profile(source);
    const content = this.contentAnalyzer.analyze(source);
    const seo = this.seoGenerator.generate(source);
    const theme = this.themeSelector.select(source);
    const products = this.productRecommender.recommend(source);
    const sections = this.sectionRecommender.recommend(source);
    const socialLinks = this.socialGraph.build(source);
    const businessModel = this.buildBusinessModel(source, creator, products);

    const confidence = this.calculateOverallConfidence([
      creator.confidence,
      brand.confidence,
      audience.confidence,
      content.confidence,
      seo.confidence,
      theme.confidence,
      businessModel.confidence,
    ]);

    return {
      creator,
      brand,
      audience,
      products,
      content,
      seo,
      theme,
      sections,
      socialLinks,
      businessModel,
      confidence,
    };
  }

  private buildBusinessModel(source: ContentSource, creator: CreatorIntelligence, products: ProductIntelligence[]): BusinessModelIntelligence {
    const hasPhysical = products.some((p) => p.type === "physical");
    const hasDigital = products.some((p) => p.type === "digital");
    const hasService = products.some((p) => p.type === "service");

    let type: BusinessModelIntelligence["type"] = "merch";
    if (hasPhysical && hasDigital) type = "mixed";
    else if (hasDigital && hasService) type = "mixed";
    else if (hasDigital) type = "digital_products";
    else if (hasService) type = "services";

    const channels: string[] = [];
    if (hasPhysical) channels.push("Merchandise");
    if (hasDigital) channels.push("Digital Products");
    if (hasService) channels.push("Services");

    const text = source.bio?.toLowerCase() ?? "";
    let primarySource = "Product Sales";
    if (text.includes("affiliate") || text.includes("sponsor")) primarySource = "Affiliate Marketing";
    if (text.includes("course") || text.includes("coach")) primarySource = "Digital Products";

    const followerCount = creator.followers;
    let priceTier: "budget" | "mid" | "premium" = "mid";
    if (followerCount < 5000) priceTier = "budget";
    if (followerCount > 100000) priceTier = "premium";

    return {
      type: type as BusinessModelIntelligence["type"],
      primaryRevenueSource: primarySource,
      monetizationChannels: channels.length > 0 ? channels : ["Product Sales"],
      priceTier,
      confidence: source.followers > 0 ? 0.6 : 0.3,
    };
  }

  private calculateOverallConfidence(scores: number[]): number {
    if (scores.length === 0) return 0;
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length;
    return Math.round(avg * 100) / 100;
  }
}

interface CreatorIntelligence { followers: number; confidence: number; }
interface ProductIntelligence { type: string; }
