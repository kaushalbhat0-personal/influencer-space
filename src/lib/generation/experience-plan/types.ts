export interface HeroPlan {
  readonly variant: "standard" | "minimal" | "prominent" | "split" | "fullscreen";
  readonly headlineAlignment: "left" | "center" | "right";
  readonly showProfile: boolean;
  readonly showPricing: boolean;
  readonly showSocialProof: boolean;
  readonly overlay: boolean;
  readonly ctaStyle: "solid" | "outline" | "ghost";
  readonly badge: boolean;
}

export interface PricingPlan {
  readonly visibility: "hidden" | "compact" | "full" | "prominent";
  readonly showComparison: boolean;
  readonly badgeStyle: "none" | "sale" | "premium" | "bestseller";
}

export interface SocialProofPlan {
  readonly testimonialsEnabled: boolean;
  readonly testimonialCount: number;
  readonly testimonialStyle: "carousel" | "grid" | "list";
  readonly showRatings: boolean;
  readonly showReviewCount: boolean;
  readonly socialLinksStyle: "icons" | "buttons" | "minimal";
}

export interface GalleryPlan {
  readonly layout: "grid" | "masonry" | "carousel";
  readonly columns: number;
  readonly showTitles: boolean;
  readonly lightboxEnabled: boolean;
  readonly titleStyle: "persona_name" | "niche_label";
}

export interface TestimonialPlan {
  readonly enabled: boolean;
  readonly sectionPlacement: "after_hero" | "before_products" | "after_products" | "bottom";
  readonly maxItems: number;
  readonly style: "carousel" | "grid" | "list";
}

export interface CTAPlan {
  readonly primaryStyle: "solid" | "outline" | "gradient";
  readonly primarySize: "sm" | "md" | "lg";
  readonly secondaryVisible: boolean;
  readonly secondaryStyle: "outline" | "text" | "ghost";
  readonly icon: "arrow" | "cart" | "play" | "none";
}

export interface FooterPlan {
  readonly showSocialLinks: boolean;
  readonly showNewsletter: boolean;
  readonly showBackToTop: boolean;
  readonly linksLayout: "horizontal" | "vertical" | "grid";
  readonly copyrightStyle: "full" | "minimal";
}

export interface NavigationLink {
  readonly label: string;
  readonly href: string;
}

export interface NavigationPlan {
  readonly style: "standard" | "centered" | "minimal" | "hamburger";
  readonly sticky: boolean;
  readonly transparent: boolean;
  readonly searchEnabled: boolean;
  readonly links: readonly NavigationLink[];
}

export interface ThemePlan {
  readonly density: "compact" | "comfortable" | "spacious";
  readonly cardStyle: "flat" | "elevated" | "outlined";
  readonly borderRadius: "sharp" | "rounded" | "pill";
  readonly shadowDepth: "flat" | "subtle" | "medium" | "deep";
}

export interface SectionOrderPlan {
  readonly order: readonly string[];
  readonly pinned: readonly string[];
  readonly hidden: readonly string[];
}

export interface PagePlan {
  readonly pageTypes: readonly string[];
  readonly homePageSections: readonly string[];
}

export interface ConversionGoal {
  readonly primary: "awareness" | "engagement" | "sales" | "community" | "education";
  readonly secondary: "awareness" | "engagement" | "sales" | "community" | "education" | null;
}

export interface SEOPlan {
  readonly priority: "low" | "medium" | "high";
  readonly focusKeywords: number;
  readonly structuredData: boolean;
  readonly openGraph: boolean;
}

export type PlanSlice = keyof ExperiencePlan;

export interface ExperiencePlan {
  readonly hero: HeroPlan;
  readonly pricing: PricingPlan;
  readonly socialProof: SocialProofPlan;
  readonly gallery: GalleryPlan;
  readonly testimonial: TestimonialPlan;
  readonly cta: CTAPlan;
  readonly footer: FooterPlan;
  readonly navigation: NavigationPlan;
  readonly theme: ThemePlan;
  readonly sectionOrder: SectionOrderPlan;
  readonly page: PagePlan;
  readonly conversionGoal: ConversionGoal;
  readonly seo: SEOPlan;
  readonly contentDensity: "sparse" | "normal" | "dense";
  readonly visualRhythm: "calm" | "balanced" | "dynamic";
  readonly mobilePriority: "low" | "medium" | "high";
  readonly animationProfile: "minimal" | "moderate" | "expressive";
  readonly recommendationSlots: number;
}
