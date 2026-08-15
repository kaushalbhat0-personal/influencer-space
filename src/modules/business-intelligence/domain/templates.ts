import type { BusinessTemplate } from "./types";

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
  {
    id: "creator", name: "Creator", category: "creator",
    themeFamily: "vibrant", themeReason: "Creators typically use vibrant, energetic themes to match their personality.",
    pages: [
      { name: "Home", slug: "/", isHome: true, order: 0 },
      { name: "Products", slug: "/products", isHome: false, order: 1 },
      { name: "Community", slug: "/community", isHome: false, order: 2 },
      { name: "About", slug: "/about", isHome: false, order: 3 },
      { name: "Contact", slug: "/contact", isHome: false, order: 4 },
    ],
    sections: [
      { moduleId: "hero.default", pageSlug: "/", order: 0 },
      { moduleId: "products.grid", pageSlug: "/", order: 1 },
      { moduleId: "testimonials.default", pageSlug: "/", order: 2 },
      { moduleId: "newsletter.default", pageSlug: "/", order: 3 },
    ],
    navigation: [
      { label: "Home", href: "/", order: 0 },
      { label: "Products", href: "/products", order: 1 },
      { label: "Community", href: "/community", order: 2 },
      { label: "About", href: "/about", order: 3 },
      { label: "Contact", href: "/contact", order: 4 },
    ],
    offers: [
      { type: "membership", name: "Premium Membership", description: "Exclusive access to premium content and community.", priceHint: "499/month" },
      { type: "digital_download", name: "Digital Product Pack", description: "Curated digital products and resources.", priceHint: "999" },
      { type: "course", name: "Online Course", description: "In-depth video course on your expertise.", priceHint: "2999" },
    ],
    seo: { titleTemplate: "{businessName} — Creator Storefront", descriptionTemplate: "{businessName}: {tagline || 'Premium creator storefront on CreatorStore'}" },
    conversion: [
      { widget: "newsletter", priority: 1 },
      { widget: "social_proof", priority: 2 },
      { widget: "cta_banner", priority: 3 },
    ],
  },
  {
    id: "coach", name: "Coach", category: "coach",
    themeFamily: "professional", themeReason: "92% of coaching businesses use professional, clean layouts to establish trust.",
    pages: [
      { name: "Home", slug: "/", isHome: true, order: 0 },
      { name: "Services", slug: "/services", isHome: false, order: 1 },
      { name: "Book a Session", slug: "/book", isHome: false, order: 2 },
      { name: "Testimonials", slug: "/testimonials", isHome: false, order: 3 },
      { name: "FAQ", slug: "/faq", isHome: false, order: 4 },
      { name: "Contact", slug: "/contact", isHome: false, order: 5 },
    ],
    sections: [
      { moduleId: "hero.default", pageSlug: "/", order: 0 },
      { moduleId: "services.default", pageSlug: "/", order: 1 },
      { moduleId: "testimonials.default", pageSlug: "/", order: 2 },
    ],
    navigation: [
      { label: "Home", href: "/", order: 0 },
      { label: "Services", href: "/services", order: 1 },
      { label: "Book a Session", href: "/book", order: 2 },
      { label: "Testimonials", href: "/testimonials", order: 3 },
      { label: "FAQ", href: "/faq", order: 4 },
      { label: "Contact", href: "/contact", order: 5 },
    ],
    offers: [
      { type: "consultation", name: "1:1 Coaching Session", description: "Personalized coaching session tailored to your goals.", priceHint: "2499" },
      { type: "course", name: "Online Program", description: "Structured program with video lessons and materials.", priceHint: "4999" },
      { type: "membership", name: "Community Access", description: "Join a community of like-minded individuals.", priceHint: "999/month" },
    ],
    seo: { titleTemplate: "{businessName} — Coaching & Consulting", descriptionTemplate: "{businessName}: {tagline || 'Professional coaching services on CreatorStore'}" },
    conversion: [
      { widget: "booking", priority: 1 },
      { widget: "testimonials", priority: 2 },
      { widget: "faq", priority: 3 },
    ],
  },
  {
    id: "restaurant", name: "Restaurant / Food Business", category: "restaurant",
    themeFamily: "warm", themeReason: "Restaurants perform best with warm, appetizing color schemes and rich imagery.",
    pages: [
      { name: "Home", slug: "/", isHome: true, order: 0 },
      { name: "Menu", slug: "/menu", isHome: false, order: 1 },
      { name: "Gallery", slug: "/gallery", isHome: false, order: 2 },
      { name: "Location & Hours", slug: "/location", isHome: false, order: 3 },
      { name: "Contact", slug: "/contact", isHome: false, order: 4 },
    ],
    sections: [
      { moduleId: "hero.default", pageSlug: "/", order: 0 },
      { moduleId: "gallery.grid", pageSlug: "/", order: 1 },
      { moduleId: "testimonials.default", pageSlug: "/", order: 2 },
    ],
    navigation: [
      { label: "Home", href: "/", order: 0 },
      { label: "Menu", href: "/menu", order: 1 },
      { label: "Gallery", href: "/gallery", order: 2 },
      { label: "Location", href: "/location", order: 3 },
      { label: "Contact", href: "/contact", order: 4 },
    ],
    offers: [
      { type: "booking", name: "Table Reservation", description: "Reserve a table for your dining experience.", priceHint: "Free" },
      { type: "gift_card", name: "Gift Card", description: "Give the gift of a great meal.", priceHint: "500" },
      { type: "physical_product", name: "Merchandise", description: "Branded merchandise and packaged goods.", priceHint: "999" },
    ],
    seo: { titleTemplate: "{businessName} — Restaurant & Dining", descriptionTemplate: "{businessName}: {tagline || 'Experience exceptional dining on CreatorStore'}" },
    conversion: [
      { widget: "booking", priority: 1 },
      { widget: "reviews", priority: 2 },
      { widget: "gift_card", priority: 3 },
    ],
  },
  {
    id: "agency", name: "Agency", category: "agency",
    themeFamily: "corporate", themeReason: "Agencies convert better with corporate, professional themes that showcase portfolio work.",
    pages: [
      { name: "Home", slug: "/", isHome: true, order: 0 },
      { name: "Services", slug: "/services", isHome: false, order: 1 },
      { name: "Case Studies", slug: "/case-studies", isHome: false, order: 2 },
      { name: "Pricing", slug: "/pricing", isHome: false, order: 3 },
      { name: "About", slug: "/about", isHome: false, order: 4 },
      { name: "Contact", slug: "/contact", isHome: false, order: 5 },
    ],
    sections: [
      { moduleId: "hero.default", pageSlug: "/", order: 0 },
      { moduleId: "services.default", pageSlug: "/", order: 1 },
      { moduleId: "testimonials.default", pageSlug: "/", order: 2 },
      { moduleId: "contact.default", pageSlug: "/", order: 3 },
    ],
    navigation: [
      { label: "Home", href: "/", order: 0 },
      { label: "Services", href: "/services", order: 1 },
      { label: "Case Studies", href: "/case-studies", order: 2 },
      { label: "Pricing", href: "/pricing", order: 3 },
      { label: "About", href: "/about", order: 4 },
      { label: "Contact", href: "/contact", order: 5 },
    ],
    offers: [
      { type: "service", name: "Strategy Session", description: "Comprehensive strategy review and roadmap.", priceHint: "9999" },
      { type: "consultation", name: "Discovery Call", description: "Free initial consultation to understand your needs.", priceHint: "Free" },
      { type: "retainer", name: "Monthly Retainer", description: "Ongoing support and execution partnership.", priceHint: "24999/month" },
    ],
    seo: { titleTemplate: "{businessName} — Agency Services", descriptionTemplate: "{businessName}: {tagline || 'Full-service agency on CreatorStore'}" },
    conversion: [
      { widget: "booking", priority: 1 },
      { widget: "case_studies", priority: 2 },
      { widget: "pricing", priority: 3 },
    ],
  },
  {
    id: "freelancer", name: "Freelancer", category: "freelancer",
    themeFamily: "minimal", themeReason: "Freelancers benefit from minimal, focused themes that let portfolio work speak for itself.",
    pages: [
      { name: "Home", slug: "/", isHome: true, order: 0 },
      { name: "Portfolio", slug: "/portfolio", isHome: false, order: 1 },
      { name: "Services", slug: "/services", isHome: false, order: 2 },
      { name: "About", slug: "/about", isHome: false, order: 3 },
      { name: "Contact", slug: "/contact", isHome: false, order: 4 },
    ],
    sections: [
      { moduleId: "hero.default", pageSlug: "/", order: 0 },
      { moduleId: "gallery.grid", pageSlug: "/", order: 1 },
      { moduleId: "services.default", pageSlug: "/", order: 2 },
      { moduleId: "testimonials.default", pageSlug: "/", order: 3 },
      { moduleId: "contact.default", pageSlug: "/", order: 4 },
    ],
    navigation: [
      { label: "Home", href: "/", order: 0 },
      { label: "Portfolio", href: "/portfolio", order: 1 },
      { label: "Services", href: "/services", order: 2 },
      { label: "About", href: "/about", order: 3 },
      { label: "Contact", href: "/contact", order: 4 },
    ],
    offers: [
      { type: "service", name: "Project Package", description: "End-to-end project delivery.", priceHint: "4999" },
      { type: "consultation", name: "Consultation", description: "Expert advice and guidance.", priceHint: "1499" },
      { type: "digital_download", name: "Resource Pack", description: "Ready-to-use templates and assets.", priceHint: "799" },
    ],
    seo: { titleTemplate: "{businessName} — Freelancer Portfolio", descriptionTemplate: "{businessName}: {tagline || 'Freelance services on CreatorStore'}" },
    conversion: [
      { widget: "portfolio", priority: 1 },
      { widget: "testimonials", priority: 2 },
      { widget: "cta_banner", priority: 3 },
    ],
  },
  {
    id: "fitness", name: "Fitness / Gym", category: "fitness",
    themeFamily: "energetic", themeReason: "Fitness businesses convert better with energetic themes and bold colors.",
    pages: [
      { name: "Home", slug: "/", isHome: true, order: 0 },
      { name: "Programs", slug: "/programs", isHome: false, order: 1 },
      { name: "Pricing", slug: "/pricing", isHome: false, order: 2 },
      { name: "Schedule", slug: "/schedule", isHome: false, order: 3 },
      { name: "Contact", slug: "/contact", isHome: false, order: 4 },
    ],
    sections: [
      { moduleId: "hero.fitness", pageSlug: "/", order: 0 },
      { moduleId: "services.default", pageSlug: "/", order: 1 },
      { moduleId: "testimonials.default", pageSlug: "/", order: 2 },
    ],
    navigation: [
      { label: "Home", href: "/", order: 0 },
      { label: "Programs", href: "/programs", order: 1 },
      { label: "Pricing", href: "/pricing", order: 2 },
      { label: "Schedule", href: "/schedule", order: 3 },
      { label: "Contact", href: "/contact", order: 4 },
    ],
    offers: [
      { type: "membership", name: "Gym Membership", description: "Full access to all facilities and classes.", priceHint: "1999/month" },
      { type: "booking", name: "Personal Training", description: "One-on-one training sessions.", priceHint: "999/session" },
      { type: "digital_download", name: "Workout Plan", description: "Customized workout and nutrition plan.", priceHint: "1499" },
    ],
    seo: { titleTemplate: "{businessName} — Fitness & Training", descriptionTemplate: "{businessName}: {tagline || 'Transform your fitness journey on CreatorStore'}" },
    conversion: [
      { widget: "booking", priority: 1 },
      { widget: "pricing", priority: 2 },
      { widget: "cta_banner", priority: 3 },
    ],
  },
  {
    id: "default", name: "General Business", category: "other",
    themeFamily: "clean", themeReason: "A clean, versatile theme works well for most business types.",
    pages: [
      { name: "Home", slug: "/", isHome: true, order: 0 },
      { name: "Products", slug: "/products", isHome: false, order: 1 },
      { name: "About", slug: "/about", isHome: false, order: 2 },
      { name: "Contact", slug: "/contact", isHome: false, order: 3 },
    ],
    sections: [
      { moduleId: "hero.default", pageSlug: "/", order: 0 },
      { moduleId: "products.grid", pageSlug: "/", order: 1 },
      { moduleId: "contact.default", pageSlug: "/", order: 2 },
    ],
    navigation: [
      { label: "Home", href: "/", order: 0 },
      { label: "Products", href: "/products", order: 1 },
      { label: "About", href: "/about", order: 2 },
      { label: "Contact", href: "/contact", order: 3 },
    ],
    offers: [
      { type: "service", name: "Standard Service", description: "Professional service tailored to your needs.", priceHint: "999" },
      { type: "digital_download", name: "Digital Product", description: "High-quality digital download.", priceHint: "499" },
    ],
    seo: { titleTemplate: "{businessName} — Storefront", descriptionTemplate: "{businessName}: {tagline || 'Storefront on CreatorStore'}" },
    conversion: [
      { widget: "cta_banner", priority: 1 },
      { widget: "testimonials", priority: 2 },
    ],
  },
];

export function getTemplate(category: string): BusinessTemplate {
  return BUSINESS_TEMPLATES.find((t) => t.id === category) || BUSINESS_TEMPLATES.find((t) => t.id === "default")!;
}
