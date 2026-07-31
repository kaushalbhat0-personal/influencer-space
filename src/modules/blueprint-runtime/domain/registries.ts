export interface WidgetDefinition {
  type: string;
  label: string;
  tier: "free" | "premium" | "experimental";
  requires?: string[];
}

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  { type: "hero", label: "Hero Section", tier: "free" },
  { type: "about", label: "About", tier: "free" },
  { type: "products", label: "Products", tier: "free" },
  { type: "services", label: "Services", tier: "free" },
  { type: "gallery", label: "Gallery", tier: "free" },
  { type: "testimonials", label: "Testimonials", tier: "free" },
  { type: "faq", label: "FAQ", tier: "free" },
  { type: "contact", label: "Contact Form", tier: "free" },
  { type: "cta", label: "Call to Action", tier: "free" },
  { type: "newsletter", label: "Newsletter", tier: "free" },
  { type: "social", label: "Social Links", tier: "free" },
  { type: "pricing", label: "Pricing Table", tier: "free" },
  { type: "booking", label: "Booking", tier: "premium", requires: ["payment"] },
  { type: "community", label: "Community", tier: "premium" },
  { type: "analytics", label: "Analytics", tier: "premium" },
  { type: "ai_chat", label: "AI Chat Widget", tier: "experimental" },
  { type: "ai_recommendations", label: "AI Recommendations", tier: "experimental" },
];

export interface LayoutDefinition {
  id: string;
  label: string;
  tier: "free" | "premium";
}

export const LAYOUT_REGISTRY: LayoutDefinition[] = [
  { id: "default", label: "Default Layout", tier: "free" },
  { id: "compact", label: "Compact Layout", tier: "free" },
  { id: "spacious", label: "Spacious Layout", tier: "free" },
  { id: "magazine", label: "Magazine Layout", tier: "premium" },
  { id: "showcase", label: "Showcase Layout", tier: "premium" },
];

export interface FeatureFlag {
  key: string;
  label: string;
  defaultEnabled: boolean;
  tier: "free" | "premium" | "experimental";
}

export const FEATURE_REGISTRY: FeatureFlag[] = [
  { key: "booking", label: "Booking System", defaultEnabled: false, tier: "premium" },
  { key: "commerce", label: "Commerce", defaultEnabled: true, tier: "free" },
  { key: "community", label: "Community", defaultEnabled: false, tier: "premium" },
  { key: "analytics", label: "Analytics", defaultEnabled: true, tier: "free" },
  { key: "ai_widgets", label: "AI Widgets", defaultEnabled: false, tier: "experimental" },
  { key: "seo", label: "SEO Tools", defaultEnabled: true, tier: "free" },
  { key: "custom_domain", label: "Custom Domain", defaultEnabled: false, tier: "premium" },
];

export function getWidgetTier(type: string): WidgetDefinition["tier"] {
  const parts = type.split(".");
  const base = parts[0];
  const widget = WIDGET_REGISTRY.find((w) => w.type === base);
  return widget?.tier || "free";
}
