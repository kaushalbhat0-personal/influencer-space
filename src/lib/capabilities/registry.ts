export type CapabilityId = string;

export interface CapabilityDefinition {
  id: CapabilityId;
  name: string;
  description: string;
  group: "builder" | "design" | "commerce" | "media" | "analytics" | "marketing" | "platform" | "agency" | "enterprise";
}

export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  capabilityId: CapabilityId | null;
  domainOwner: string;
  navLocation?: {
    group: string;
    label: string;
    order: number;
  };
  status: "ga" | "beta" | "experimental";
  metadata?: Record<string, unknown>;
}

const CAPABILITIES: CapabilityDefinition[] = [
  { id: "basic_builder", name: "Basic Builder", description: "Page layout editor", group: "builder" },
  { id: "advanced_builder", name: "Advanced Builder", description: "Custom components and advanced layout", group: "builder" },
  { id: "premium_themes", name: "Premium Themes", description: "Access to premium theme marketplace", group: "design" },
  { id: "custom_domain", name: "Custom Domain", description: "Connect custom domain", group: "platform" },
  { id: "analytics_basic", name: "Basic Analytics", description: "Dashboard metrics", group: "analytics" },
  { id: "analytics_advanced", name: "Advanced Analytics", description: "Funnels, heatmaps, visitor data", group: "analytics" },
  { id: "media_storage", name: "Media Storage", description: "Asset upload and storage", group: "media" },
  { id: "api_integrations", name: "API Integrations", description: "Connect external APIs", group: "platform" },
  { id: "api_access", name: "API Access", description: "API access for integrations", group: "platform" },
  { id: "webhooks", name: "Webhooks", description: "Webhook integrations", group: "platform" },
  { id: "live_social_sync", name: "Live Social Sync", description: "Real-time sync to social platforms", group: "platform" },
  { id: "automation", name: "Automation", description: "Workflow automation", group: "marketing" },
  { id: "team_members", name: "Team Members", description: "Invite team members", group: "platform" },
  { id: "multiple_brands", name: "Multiple Brands", description: "Manage multiple storefronts", group: "platform" },
  { id: "agency_clients", name: "Agency Clients", description: "Create and manage clients", group: "agency" },
  { id: "bulk_publish", name: "Bulk Publish", description: "Publish multiple sites at once", group: "agency" },
  { id: "custom_components", name: "Custom Components", description: "Build custom components", group: "builder" },
  { id: "white_label", name: "White Label", description: "Remove platform branding", group: "enterprise" },
  { id: "marketplace_access", name: "Marketplace", description: "Access theme and template marketplace", group: "platform" },
  { id: "template_library", name: "Template Library", description: "Use professional templates", group: "design" },
  { id: "seo_tools", name: "SEO Tools", description: "SEO configuration", group: "marketing" },
  { id: "navigation_editor", name: "Navigation Editor", description: "Custom navigation menus", group: "design" },
  { id: "custom_branding", name: "Custom Branding", description: "Custom colors and fonts", group: "design" },
];

const FEATURES: FeatureDefinition[] = [
  { id: "builder", name: "Layout Builder", description: "Page layout editor", capabilityId: "basic_builder", domainOwner: "Builder", navLocation: { group: "Website", label: "Layout Builder", order: 40 }, status: "ga" },
  { id: "theme", name: "Theme Customization", description: "Customize colors and fonts", capabilityId: "custom_branding", domainOwner: "Theme", navLocation: { group: "Website", label: "Theme", order: 30 }, status: "ga" },
  { id: "navigation", name: "Navigation Editor", description: "Custom navigation", capabilityId: "navigation_editor", domainOwner: "Navigation", navLocation: { group: "Website", label: "Navigation", order: 25 }, status: "ga" },
  { id: "profile", name: "Profile", description: "Creator identity", capabilityId: null, domainOwner: "Identity", navLocation: { group: "Website", label: "Profile", order: 10 }, status: "ga" },
  { id: "seo", name: "SEO", description: "SEO settings", capabilityId: "seo_tools", domainOwner: "SEO", navLocation: { group: "Website", label: "SEO", order: 50 }, status: "ga" },
  { id: "products", name: "Products", description: "Product catalog", capabilityId: null, domainOwner: "Commerce", navLocation: { group: "Store", label: "Products", order: 10 }, status: "ga" },
  { id: "services", name: "Services", description: "Service offerings", capabilityId: null, domainOwner: "Commerce", navLocation: { group: "Store", label: "Services", order: 15 }, status: "beta" },
  { id: "courses", name: "Courses", description: "Course catalog", capabilityId: null, domainOwner: "Commerce", navLocation: { group: "Store", label: "Courses", order: 20 }, status: "beta" },
  { id: "orders", name: "Orders", description: "Order management", capabilityId: null, domainOwner: "Commerce", navLocation: { group: "Store", label: "Orders", order: 30 }, status: "ga" },
  { id: "customers", name: "Customers", description: "Customer list", capabilityId: null, domainOwner: "Commerce", navLocation: { group: "Store", label: "Customers", order: 40 }, status: "ga" },
  { id: "hero", name: "Hero", description: "Hero section", capabilityId: null, domainOwner: "Content", navLocation: { group: "Content", label: "Hero", order: 10 }, status: "ga" },
  { id: "media_library", name: "Media Library", description: "Asset management", capabilityId: "media_storage", domainOwner: "Media", navLocation: { group: "Content", label: "Media Library", order: 5 }, status: "ga" },
  { id: "gallery", name: "Gallery", description: "Image gallery", capabilityId: null, domainOwner: "Content", navLocation: { group: "Content", label: "Gallery", order: 15 }, status: "ga" },
  { id: "content_feed", name: "Content Feed", description: "Social content feed", capabilityId: null, domainOwner: "Content", navLocation: { group: "Content", label: "Content Feed", order: 20 }, status: "ga" },
  { id: "testimonials", name: "Testimonials", description: "Customer testimonials", capabilityId: null, domainOwner: "Content", navLocation: { group: "Content", label: "Testimonials", order: 25 }, status: "ga" },
  { id: "faq", name: "FAQ", description: "Frequently asked questions", capabilityId: null, domainOwner: "Content", navLocation: { group: "Content", label: "FAQ", order: 30 }, status: "ga" },
  { id: "timeline", name: "Timeline", description: "Milestones timeline", capabilityId: null, domainOwner: "Content", navLocation: { group: "Content", label: "Timeline", order: 35 }, status: "ga" },
  { id: "games", name: "Games", description: "Game listings", capabilityId: null, domainOwner: "Content", navLocation: { group: "Content", label: "Games", order: 40 }, status: "ga" },
  { id: "links", name: "Links", description: "Affiliate links", capabilityId: null, domainOwner: "Marketing", navLocation: { group: "Marketing", label: "Links", order: 10 }, status: "ga" },
  { id: "analytics", name: "Analytics", description: "Analytics dashboard", capabilityId: "analytics_basic", domainOwner: "Analytics", navLocation: { group: "Marketing", label: "Analytics", order: 20 }, status: "ga" },
  { id: "messages", name: "Messages", description: "Contact submissions", capabilityId: null, domainOwner: "CRM", navLocation: { group: "Marketing", label: "Messages", order: 30 }, status: "ga" },
  { id: "domain", name: "Domain", description: "Custom domain configuration", capabilityId: "custom_domain", domainOwner: "Platform", navLocation: { group: "Account", label: "Domain", order: 10 }, status: "ga" },
  { id: "billing", name: "Billing", description: "Subscription and invoices", capabilityId: null, domainOwner: "Billing", navLocation: { group: "Account", label: "Billing", order: 20 }, status: "ga" },
  { id: "integrations", name: "Integrations", description: "API connections", capabilityId: "api_integrations", domainOwner: "Platform", navLocation: { group: "Account", label: "Integrations", order: 30 }, status: "ga" },
];

export class CapabilityRegistry {
  getCapability(id: CapabilityId): CapabilityDefinition | undefined {
    return CAPABILITIES.find((c) => c.id === id);
  }

  getAllCapabilities(): CapabilityDefinition[] {
    return [...CAPABILITIES];
  }

  getCapabilitiesByGroup(group: string): CapabilityDefinition[] {
    return CAPABILITIES.filter((c) => c.group === group);
  }
}

export class FeatureRegistry {
  getFeature(id: string): FeatureDefinition | undefined {
    return FEATURES.find((f) => f.id === id);
  }

  getAllFeatures(): FeatureDefinition[] {
    return [...FEATURES];
  }

  getFeaturesByDomain(domain: string): FeatureDefinition[] {
    return FEATURES.filter((f) => f.domainOwner === domain);
  }

  getFeaturesByCapability(capabilityId: string): FeatureDefinition[] {
    return FEATURES.filter((f) => f.capabilityId === capabilityId);
  }

  getNavFeatures(): FeatureDefinition[] {
    return FEATURES.filter((f) => f.navLocation).sort((a, b) => (a.navLocation?.order ?? 0) - (b.navLocation?.order ?? 0));
  }
}

export const capabilityRegistry = new CapabilityRegistry();
export const featureRegistry = new FeatureRegistry();
