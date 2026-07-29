import type { FeatureInfo, FeatureCategory } from "./types";
import { FEATURE_IDS } from "./constants";

const CATEGORY: Record<string, FeatureCategory> = {
  [FEATURE_IDS.PRODUCTS]: "products",
  [FEATURE_IDS.GALLERY]: "content",
  [FEATURE_IDS.STORAGE_GB]: "storage",
  [FEATURE_IDS.MESSAGES]: "content",
  [FEATURE_IDS.ORDERS]: "products",
  [FEATURE_IDS.WEBSITES]: "team",
  [FEATURE_IDS.TEAM_MEMBERS]: "team",
  [FEATURE_IDS.CLIENTS]: "team",
  [FEATURE_IDS.API_CALLS]: "api",
  [FEATURE_IDS.CUSTOM_DOMAIN]: "domain",
  [FEATURE_IDS.CUSTOM_BRANDING]: "branding",
  [FEATURE_IDS.REMOVE_BRANDING]: "branding",
  [FEATURE_IDS.ANALYTICS_BASIC]: "analytics",
  [FEATURE_IDS.ANALYTICS_ADVANCED]: "analytics",
  [FEATURE_IDS.SEO]: "analytics",
  [FEATURE_IDS.PREMIUM_THEMES]: "content",
  [FEATURE_IDS.AI_TOOLS]: "ai",
  [FEATURE_IDS.EXPORT]: "content",
  [FEATURE_IDS.BUILDER]: "content",
  [FEATURE_IDS.ADVANCED_BUILDER]: "content",
  [FEATURE_IDS.MARKETPLACE_ACCESS]: "content",
  [FEATURE_IDS.TEMPLATE_LIBRARY]: "content",
  [FEATURE_IDS.NAVIGATION_EDITOR]: "content",
  [FEATURE_IDS.MEDIA_STORAGE]: "storage",
  [FEATURE_IDS.AUTOMATION]: "content",
  [FEATURE_IDS.MULTIPLE_BRANDS]: "team",
  [FEATURE_IDS.AGENCY_CLIENTS]: "team",
  [FEATURE_IDS.BULK_PUBLISH]: "content",
  [FEATURE_IDS.CUSTOM_COMPONENTS]: "content",
  [FEATURE_IDS.API_INTEGRATIONS]: "api",
  [FEATURE_IDS.PRIORITY_SUPPORT]: "support",
  [FEATURE_IDS.MULTIPLE_USERS]: "team",
  [FEATURE_IDS.API_ACCESS]: "api",
  [FEATURE_IDS.WEBHOOKS]: "api",
  [FEATURE_IDS.WHITE_LABEL]: "branding",
};

export function getFeatureInfo(id: string): FeatureInfo {
  const entry = FEATURE_CATALOG[id];
  if (entry) return entry;
  return {
    id: id as FeatureInfo["id"],
    label: id.replace(/_/g, " ").replace(/(?:^|\s)\S/g, (c) => c.toUpperCase()),
    description: "",
    category: CATEGORY[id] ?? "content",
    valueType: typeof id === "string" && id.startsWith("max_") ? "numeric" : "boolean",
  };
}

export const FEATURE_CATALOG: Record<string, FeatureInfo> = {
  [FEATURE_IDS.PRODUCTS]: {
    id: FEATURE_IDS.PRODUCTS, label: "Products", description: "Maximum products per store",
    category: "products", valueType: "numeric",
  },
  [FEATURE_IDS.GALLERY]: {
    id: FEATURE_IDS.GALLERY, label: "Gallery Items", description: "Maximum gallery items",
    category: "content", valueType: "numeric",
  },
  [FEATURE_IDS.STORAGE_GB]: {
    id: FEATURE_IDS.STORAGE_GB, label: "Storage", description: "Storage limit in GB",
    category: "storage", valueType: "numeric",
  },
  [FEATURE_IDS.MESSAGES]: {
    id: FEATURE_IDS.MESSAGES, label: "Messages", description: "Maximum messages per month",
    category: "content", valueType: "numeric",
  },
  [FEATURE_IDS.ORDERS]: {
    id: FEATURE_IDS.ORDERS, label: "Orders", description: "Maximum orders per month",
    category: "products", valueType: "numeric",
  },
  [FEATURE_IDS.WEBSITES]: {
    id: FEATURE_IDS.WEBSITES, label: "Websites", description: "Maximum websites per account",
    category: "team", valueType: "numeric",
  },
  [FEATURE_IDS.TEAM_MEMBERS]: {
    id: FEATURE_IDS.TEAM_MEMBERS, label: "Team Members", description: "Maximum team members",
    category: "team", valueType: "numeric",
  },
  [FEATURE_IDS.CLIENTS]: {
    id: FEATURE_IDS.CLIENTS, label: "Clients", description: "Maximum managed clients (agencies)",
    category: "team", valueType: "numeric",
  },
  [FEATURE_IDS.API_CALLS]: {
    id: FEATURE_IDS.API_CALLS, label: "API Calls", description: "Maximum API calls per month",
    category: "api", valueType: "numeric",
  },
  [FEATURE_IDS.CUSTOM_DOMAIN]: {
    id: FEATURE_IDS.CUSTOM_DOMAIN, label: "Custom Domain", description: "Custom domain support",
    category: "domain", valueType: "boolean",
  },
  [FEATURE_IDS.CUSTOM_BRANDING]: {
    id: FEATURE_IDS.CUSTOM_BRANDING, label: "Custom Branding", description: "Custom branding options",
    category: "branding", valueType: "boolean",
  },
  [FEATURE_IDS.REMOVE_BRANDING]: {
    id: FEATURE_IDS.REMOVE_BRANDING, label: "Remove Branding", description: "Remove CreatorStore branding",
    category: "branding", valueType: "boolean",
  },
  [FEATURE_IDS.ANALYTICS_BASIC]: {
    id: FEATURE_IDS.ANALYTICS_BASIC, label: "Basic Analytics", description: "Basic analytics and insights",
    category: "analytics", valueType: "boolean",
  },
  [FEATURE_IDS.ANALYTICS_ADVANCED]: {
    id: FEATURE_IDS.ANALYTICS_ADVANCED, label: "Advanced Analytics", description: "Advanced analytics and reports",
    category: "analytics", valueType: "boolean",
  },
  [FEATURE_IDS.SEO]: {
    id: FEATURE_IDS.SEO, label: "SEO Tools", description: "SEO optimization tools",
    category: "analytics", valueType: "boolean",
  },
  [FEATURE_IDS.PREMIUM_THEMES]: {
    id: FEATURE_IDS.PREMIUM_THEMES, label: "Premium Themes", description: "Access to premium themes",
    category: "content", valueType: "boolean",
  },
  [FEATURE_IDS.AI_TOOLS]: {
    id: FEATURE_IDS.AI_TOOLS, label: "AI Tools", description: "AI-powered content and marketing tools",
    category: "ai", valueType: "boolean",
  },
  [FEATURE_IDS.EXPORT]: {
    id: FEATURE_IDS.EXPORT, label: "Export", description: "Data export capabilities",
    category: "content", valueType: "boolean",
  },
  [FEATURE_IDS.PRIORITY_SUPPORT]: {
    id: FEATURE_IDS.PRIORITY_SUPPORT, label: "Priority Support", description: "Priority support channel",
    category: "support", valueType: "boolean",
  },
  [FEATURE_IDS.MULTIPLE_USERS]: {
    id: FEATURE_IDS.MULTIPLE_USERS, label: "Multiple Users", description: "Multiple user accounts",
    category: "team", valueType: "boolean",
  },
  [FEATURE_IDS.API_ACCESS]: {
    id: FEATURE_IDS.API_ACCESS, label: "API Access", description: "API access for integrations",
    category: "api", valueType: "boolean",
  },
  [FEATURE_IDS.WEBHOOKS]: {
    id: FEATURE_IDS.WEBHOOKS, label: "Webhooks", description: "Webhook integrations",
    category: "api", valueType: "boolean",
  },
  [FEATURE_IDS.WHITE_LABEL]: {
    id: FEATURE_IDS.WHITE_LABEL, label: "White Label", description: "White-label experience",
    category: "branding", valueType: "boolean",
  },
  [FEATURE_IDS.BUILDER]: {
    id: FEATURE_IDS.BUILDER, label: "Layout Builder", description: "Page layout editor",
    category: "content", valueType: "boolean",
  },
  [FEATURE_IDS.ADVANCED_BUILDER]: {
    id: FEATURE_IDS.ADVANCED_BUILDER, label: "Advanced Builder", description: "Custom components and advanced layout",
    category: "content", valueType: "boolean",
  },
  [FEATURE_IDS.MARKETPLACE_ACCESS]: {
    id: FEATURE_IDS.MARKETPLACE_ACCESS, label: "Marketplace", description: "Access theme and template marketplace",
    category: "content", valueType: "boolean",
  },
  [FEATURE_IDS.TEMPLATE_LIBRARY]: {
    id: FEATURE_IDS.TEMPLATE_LIBRARY, label: "Template Library", description: "Use professional templates",
    category: "content", valueType: "boolean",
  },
  [FEATURE_IDS.NAVIGATION_EDITOR]: {
    id: FEATURE_IDS.NAVIGATION_EDITOR, label: "Navigation Editor", description: "Custom navigation menus",
    category: "content", valueType: "boolean",
  },
  [FEATURE_IDS.MEDIA_STORAGE]: {
    id: FEATURE_IDS.MEDIA_STORAGE, label: "Media Storage", description: "Asset upload and storage",
    category: "storage", valueType: "boolean",
  },
  [FEATURE_IDS.AUTOMATION]: {
    id: FEATURE_IDS.AUTOMATION, label: "Automation", description: "Workflow automation",
    category: "content", valueType: "boolean",
  },
  [FEATURE_IDS.MULTIPLE_BRANDS]: {
    id: FEATURE_IDS.MULTIPLE_BRANDS, label: "Multiple Brands", description: "Manage multiple storefronts",
    category: "team", valueType: "boolean",
  },
  [FEATURE_IDS.AGENCY_CLIENTS]: {
    id: FEATURE_IDS.AGENCY_CLIENTS, label: "Agency Clients", description: "Create and manage clients",
    category: "team", valueType: "boolean",
  },
  [FEATURE_IDS.BULK_PUBLISH]: {
    id: FEATURE_IDS.BULK_PUBLISH, label: "Bulk Publish", description: "Publish multiple sites at once",
    category: "content", valueType: "boolean",
  },
  [FEATURE_IDS.CUSTOM_COMPONENTS]: {
    id: FEATURE_IDS.CUSTOM_COMPONENTS, label: "Custom Components", description: "Build custom components",
    category: "content", valueType: "boolean",
  },
  [FEATURE_IDS.API_INTEGRATIONS]: {
    id: FEATURE_IDS.API_INTEGRATIONS, label: "API Integrations", description: "Connect external APIs",
    category: "api", valueType: "boolean",
  },
};

export function getAllFeatureIds(): string[] {
  return Object.keys(FEATURE_CATALOG);
}

export function getFeaturesByCategory(category: FeatureCategory): FeatureInfo[] {
  return Object.values(FEATURE_CATALOG).filter((f) => f.category === category);
}
