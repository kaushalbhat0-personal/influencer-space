import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { SEOBlueprint } from "./types";
import { getVocabulary } from "@/lib/generation/content/vocabularies";

export class SEOComposer {
  compose(graph: KnowledgeGraph): SEOBlueprint {
    const vocab = getVocabulary(graph.creator.niche);
    const name = graph.creator.name;
    const slug = graph.seo.slug || graph.creator.username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    return {
      title: `${name} ${vocab.meta.titleSuffix.replace("{name}", name)}`,
      description: `${vocab.meta.descriptionPrefix} ${name}. ${graph.creator.bio?.slice(0, 100) ?? ""}`,
      keywords: graph.seo.keywords || [],
      ogImage: "",
      ogType: "website",
      twitterHandle: graph.socialLinks.find((l) => l.platform === "twitter")?.handle ?? "",
      canonical: `https://${slug}.creatorstore.com`,
      sitemapPriority: 1.0,
      sitemapChangefreq: "weekly",
      structuredData: {
        "@context": "https://schema.org",
        "@type": "Person",
        name,
        description: graph.creator.bio,
        url: `https://${slug}.creatorstore.com`,
        sameAs: graph.socialLinks.map((l) => l.url),
      },
    };
  }
}
