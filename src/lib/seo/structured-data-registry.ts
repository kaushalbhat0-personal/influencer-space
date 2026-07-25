import type { StructuredData, SchemaConfig } from "./types";

interface SchemaEntry {
  config: SchemaConfig;
}

export class StructuredDataRegistry {
  private entries = new Map<string, SchemaEntry>();

  registerSchema(config: SchemaConfig): void {
    this.entries.set(config.type, { config });
  }

  registerSchemas(configs: SchemaConfig[]): void {
    for (const config of configs) {
      this.registerSchema(config);
    }
  }

  unregisterSchema(type: string): boolean {
    return this.entries.delete(type);
  }

  get(type: string): SchemaConfig | undefined {
    return this.entries.get(type)?.config;
  }

  getAll(): SchemaConfig[] {
    return Array.from(this.entries.values())
      .filter((e) => e.config.enabled)
      .map((e) => e.config);
  }

  build(type: string, params: Record<string, unknown>): StructuredData {
    const entry = this.entries.get(type);
    if (!entry) return { type, jsonLd: {}, valid: false, errors: [`Unknown schema type: ${type}`] };

    const { config } = entry;
    if (!config.enabled) return { type, jsonLd: {}, valid: false, errors: [`Schema type ${type} is disabled`] };

    if (config.condition && !config.condition(params)) {
      return { type, jsonLd: {}, valid: true, errors: [] };
    }

    try {
      const jsonLd = config.build(params);
      return { type: config.type, jsonLd, valid: true, errors: [] };
    } catch (e) {
      return {
        type: config.type,
        jsonLd: { "@context": "https://schema.org", "@type": config.type },
        valid: false,
        errors: [`${config.type} v${config.version}: ${String(e)}`],
      };
    }
  }

  buildAll(paramsMap: Record<string, Record<string, unknown>>): StructuredData[] {
    const results: StructuredData[] = [];
    for (const [type, params] of Object.entries(paramsMap)) {
      results.push(this.build(type, params));
    }
    return results;
  }
}

export function createOrganizationSchema(): SchemaConfig {
  return {
    type: "Organization",
    version: "1.0.0",
    enabled: true,
    build(params) {
      return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: params.name,
        url: params.url,
        logo: params.logo || undefined,
        description: params.description || undefined,
        sameAs: params.sameAs || undefined,
        contactPoint: params.email ? {
          "@type": "ContactPoint",
          email: params.email,
          contactType: "customer support",
        } : undefined,
      };
    },
  };
}

export function createWebsiteSchema(): SchemaConfig {
  return {
    type: "WebSite",
    version: "1.0.0",
    enabled: true,
    build(params) {
      return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: params.name,
        url: params.url,
        description: params.description || undefined,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${params.url}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      };
    },
  };
}

export function createProductSchema(): SchemaConfig {
  return {
    type: "Product",
    version: "1.0.0",
    enabled: true,
    build(params) {
      return {
        "@context": "https://schema.org",
        "@type": "Product",
        name: params.name,
        description: params.description,
        image: params.image,
        url: params.url,
        offers: {
          "@type": "Offer",
          price: params.price,
          priceCurrency: params.currency || "INR",
          availability: params.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: params.url,
        },
      };
    },
  };
}

export function createImageGallerySchema(): SchemaConfig {
  return {
    type: "ImageGallery",
    version: "1.0.0",
    enabled: true,
    build(params) {
      const images = (params.images as { url: string; caption: string }[]) ?? [];
      return {
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        name: params.name,
        description: params.description,
        url: params.url,
        image: images.map((img) => ({
          "@type": "ImageObject",
          url: img.url,
          caption: img.caption,
        })),
      };
    },
  };
}

export function createBreadcrumbSchema(): SchemaConfig {
  return {
    type: "BreadcrumbList",
    version: "1.0.0",
    enabled: true,
    build(params) {
      const items = (params.items as { name: string; url: string }[]) ?? [];
      return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      };
    },
  };
}

export function createFAQSchema(): SchemaConfig {
  return {
    type: "FAQPage",
    version: "1.0.0",
    enabled: true,
    build(params) {
      const questions = (params.questions as { question: string; answer: string }[]) ?? [];
      return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: questions.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: q.answer,
          },
        })),
      };
    },
  };
}

export function createPersonSchema(): SchemaConfig {
  return {
    type: "Person",
    version: "1.0.0",
    enabled: true,
    build(params) {
      return {
        "@context": "https://schema.org",
        "@type": "Person",
        name: params.name,
        url: params.url,
        image: params.image || undefined,
        description: params.description || undefined,
        sameAs: params.sameAs || undefined,
      };
    },
  };
}

export function createStructuredDataRegistry(): StructuredDataRegistry {
  const registry = new StructuredDataRegistry();

  registry.registerSchemas([
    createOrganizationSchema(),
    createWebsiteSchema(),
    createProductSchema(),
    createImageGallerySchema(),
    createBreadcrumbSchema(),
    createFAQSchema(),
    createPersonSchema(),
  ]);

  return registry;
}

export const structuredDataRegistry = createStructuredDataRegistry();
