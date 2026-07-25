import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { WebsiteConfig } from "./types";

export function compose(config?: Partial<WebsiteConfig>): WebsiteConfig {
  return {
    title: config?.title ?? "My Creator Store",
    tagline: config?.tagline ?? "Welcome to my official store",
    description: config?.description ?? "Creator store powered by Influencer Space",
    domain: config?.domain ?? "default.creatorstore.com",
    locale: config?.locale ?? "en-US",
    currency: config?.currency ?? "USD",
    timezone: config?.timezone ?? "UTC",
    version: config?.version ?? 1,
  };
}

export function composeFromGraph(graph: KnowledgeGraph): WebsiteConfig {
  const name = graph.creator.name || graph.brand.name || "Creator";
  const tagline = graph.brand.tagline || `${name}'s Official Store`;

  return {
    title: name,
    tagline,
    description: graph.seo.metaDescription || graph.brand.description || `Official store for ${name}`,
    domain: `${graph.seo.slug}.creatorstore.com`,
    locale: "en-US",
    currency: "USD",
    timezone: "UTC",
    version: 1,
  };
}
