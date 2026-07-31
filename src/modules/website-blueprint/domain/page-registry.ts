export interface PageDefinition {
  slug: string;
  title: string;
  purpose: string;
  defaultVisibility: "published" | "draft" | "hidden";
  allowedSections: string[];
}

export const PAGE_REGISTRY: PageDefinition[] = [
  { slug: "/", title: "Home", purpose: "Landing page — first impression, hero, key sections", defaultVisibility: "published", allowedSections: ["hero", "about", "products", "services", "testimonials", "pricing", "gallery", "cta", "newsletter", "social", "booking", "reviews", "community", "videos"] },
  { slug: "/products", title: "Products", purpose: "Product catalog — grid or list of offerings", defaultVisibility: "published", allowedSections: ["products"] },
  { slug: "/services", title: "Services", purpose: "Service listings — grid or list of services", defaultVisibility: "published", allowedSections: ["services", "pricing", "cta"] },
  { slug: "/about", title: "About", purpose: "About the business — story, team, mission", defaultVisibility: "published", allowedSections: ["about", "testimonials"] },
  { slug: "/contact", title: "Contact", purpose: "Contact form and information", defaultVisibility: "published", allowedSections: ["contact"] },
  { slug: "/gallery", title: "Gallery", purpose: "Photo/video gallery showcase", defaultVisibility: "published", allowedSections: ["gallery"] },
  { slug: "/portfolio", title: "Portfolio", purpose: "Work/project showcase", defaultVisibility: "published", allowedSections: ["portfolio"] },
  { slug: "/pricing", title: "Pricing", purpose: "Pricing plans and packages", defaultVisibility: "published", allowedSections: ["pricing"] },
  { slug: "/testimonials", title: "Testimonials", purpose: "Customer testimonials and reviews", defaultVisibility: "published", allowedSections: ["testimonials"] },
  { slug: "/faq", title: "FAQ", purpose: "Frequently asked questions", defaultVisibility: "published", allowedSections: ["faq"] },
  { slug: "/book", title: "Book a Session", purpose: "Appointment booking and scheduling", defaultVisibility: "published", allowedSections: ["booking"] },
  { slug: "/community", title: "Community", purpose: "Community or membership information", defaultVisibility: "published", allowedSections: ["community"] },
  { slug: "/case-studies", title: "Case Studies", purpose: "Case studies and success stories", defaultVisibility: "published", allowedSections: ["case_studies"] },
  { slug: "/menu", title: "Menu", purpose: "Restaurant menu or service catalog", defaultVisibility: "published", allowedSections: ["menu"] },
  { slug: "/location", title: "Location", purpose: "Physical location and hours", defaultVisibility: "published", allowedSections: ["location"] },
  { slug: "/videos", title: "Videos", purpose: "Video content gallery", defaultVisibility: "published", allowedSections: ["videos"] },
];

export function getPageDefinition(slug: string): PageDefinition | undefined {
  return PAGE_REGISTRY.find((p) => p.slug === slug);
}
