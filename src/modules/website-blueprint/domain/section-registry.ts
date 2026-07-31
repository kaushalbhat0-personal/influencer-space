export interface SectionDefinition {
  type: string;
  label: string;
  description: string;
  allowedPages: string[];
  defaultConfiguration: Record<string, unknown>;
}

export const SECTION_REGISTRY: SectionDefinition[] = [
  { type: "hero.default", label: "Hero", description: "Full-width hero section with title and CTA", allowedPages: ["/"], defaultConfiguration: { showCta: true, ctaText: "Get Started" } },
  { type: "hero.creator", label: "Creator Hero", description: "Hero optimized for creator profiles with social proof", allowedPages: ["/"], defaultConfiguration: { showLiveBadge: false } },
  { type: "hero.professional", label: "Professional Hero", description: "Professional hero for coaches and consultants", allowedPages: ["/"], defaultConfiguration: { showBooking: true } },
  { type: "hero.restaurant", label: "Restaurant Hero", description: "Hero with food imagery and reservation CTA", allowedPages: ["/"], defaultConfiguration: { showReservation: true } },
  { type: "hero.fitness", label: "Fitness Hero", description: "Energetic hero for fitness businesses", allowedPages: ["/"], defaultConfiguration: { showCta: true, ctaText: "Start Today" } },
  { type: "hero.corporate", label: "Corporate Hero", description: "Professional hero for agencies", allowedPages: ["/"], defaultConfiguration: { showCta: true } },
  { type: "hero.minimal", label: "Minimal Hero", description: "Clean, minimal hero for portfolios", allowedPages: ["/"], defaultConfiguration: { showCta: false } },
  { type: "about.summary", label: "About Summary", description: "Brief about section with image and text", allowedPages: ["/", "/about"], defaultConfiguration: { imagePosition: "right" } },
  { type: "products.grid", label: "Product Grid", description: "Grid of products with prices", allowedPages: ["/", "/products"], defaultConfiguration: { columns: 3, showPrices: true } },
  { type: "products.featured", label: "Featured Products", description: "Featured/curated product showcase", allowedPages: ["/", "/products"], defaultConfiguration: { maxItems: 6 } },
  { type: "services.grid", label: "Services Grid", description: "Grid layout for services", allowedPages: ["/", "/services"], defaultConfiguration: { columns: 3 } },
  { type: "services.list", label: "Services List", description: "List layout for services", allowedPages: ["/", "/services"], defaultConfiguration: { showPrices: true } },
  { type: "pricing.table", label: "Pricing Table", description: "Comparison pricing table", allowedPages: ["/", "/pricing"], defaultConfiguration: { plans: 3, showCta: true } },
  { type: "gallery.grid", label: "Gallery Grid", description: "Image gallery in grid layout", allowedPages: ["/", "/gallery"], defaultConfiguration: { columns: 3, lightbox: true } },
  { type: "testimonials.carousel", label: "Testimonial Carousel", description: "Rotating testimonials carousel", allowedPages: ["/", "/testimonials", "/about"], defaultConfiguration: { autoRotate: true, interval: 5000 } },
  { type: "faq.accordion", label: "FAQ Accordion", description: "Expandable FAQ accordion", allowedPages: ["/", "/faq"], defaultConfiguration: { expandFirst: true } },
  { type: "booking.cta", label: "Booking CTA", description: "Call-to-action for booking appointments", allowedPages: ["/", "/book"], defaultConfiguration: { ctaText: "Book Now", showCalendar: true } },
  { type: "newsletter.signup", label: "Newsletter Signup", description: "Email newsletter subscription form", allowedPages: ["/"], defaultConfiguration: { showName: true } },
  { type: "contact.form", label: "Contact Form", description: "Simple contact form", allowedPages: ["/", "/contact"], defaultConfiguration: { showPhone: true } },
  { type: "social.proof", label: "Social Proof", description: "Social media follower counts and engagement", allowedPages: ["/"], defaultConfiguration: { platforms: [] } },
  { type: "cta.contact", label: "Contact CTA", description: "Call-to-action to get in touch", allowedPages: ["/"], defaultConfiguration: { ctaText: "Get in Touch" } },
  { type: "cta.signup", label: "Signup CTA", description: "Call-to-action to sign up", allowedPages: ["/"], defaultConfiguration: { ctaText: "Join Now" } },
  { type: "cta.banner", label: "CTA Banner", description: "Full-width banner with call to action", allowedPages: ["/"], defaultConfiguration: { ctaText: "Learn More" } },
  { type: "portfolio.grid", label: "Portfolio Grid", description: "Project/work showcase grid", allowedPages: ["/", "/portfolio"], defaultConfiguration: { columns: 3, showDescriptions: true } },
  { type: "case_studies.grid", label: "Case Studies Grid", description: "Case study cards for agencies", allowedPages: ["/", "/case-studies"], defaultConfiguration: { columns: 2 } },
  { type: "menu.preview", label: "Menu Preview", description: "Food/drink menu preview", allowedPages: ["/", "/menu"], defaultConfiguration: { showPrices: true } },
  { type: "location.map", label: "Location Map", description: "Map with business location", allowedPages: ["/", "/location"], defaultConfiguration: { showHours: true } },
  { type: "reviews.carousel", label: "Reviews Carousel", description: "Customer reviews carousel", allowedPages: ["/"], defaultConfiguration: { autoRotate: true } },
  { type: "community.preview", label: "Community Preview", description: "Community or membership preview", allowedPages: ["/", "/community"], defaultConfiguration: { showCount: true } },
  { type: "videos.gallery", label: "Video Gallery", description: "Grid of embedded videos", allowedPages: ["/", "/videos"], defaultConfiguration: { columns: 2 } },
];

export function getSectionDefinition(type: string): SectionDefinition | undefined {
  return SECTION_REGISTRY.find((s) => s.type === type);
}
