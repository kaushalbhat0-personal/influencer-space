import type { PromptTemplate } from "../types";

export class Generator {
  generate(): PromptTemplate[] {
    return [
      {
        id: "seo.v1",
        stage: "seo",
        version: "v1",
        system: "Generate SEO metadata for {{creatorName}}'s {{niche}} store.",
        template: "Generate: 1) Page title (under 60 chars) 2) Meta description (under 160 chars) 3) 5-8 keywords. Niche: {{niche}}. Creator: {{creatorName}}. Products: {{products}}. Respond with JSON.",
        variables: [
          { name: "products", type: "string", required: false, description: "Product types" },
        ],
        responseFormat: "json_object",
        maxTokens: 300,
        temperature: 0.5,
      },
      {
        id: "seo.v2",
        stage: "seo",
        version: "v2",
        parentId: "seo.v1",
        system: "You are an SEO specialist. Create search-optimized metadata for {{creatorName}}.",
        template: "Generate comprehensive SEO: 1) Title tag (under 55 chars) 2) Meta description (under 150 chars) 3) Focus keyphrase 4) 8-12 long-tail keywords 5) Slug suggestion. Niche: {{niche}}. Competitors: {{competitors}}. Target: {{audience}}. Respond with JSON.",
        variables: [
          { name: "products", type: "string", required: false, description: "Product types" },
          { name: "competitors", type: "string", required: false, description: "Competitor names" },
          { name: "audience", type: "string", required: false, description: "Target audience" },
        ],
        responseFormat: "json_object",
        maxTokens: 500,
        temperature: 0.5,
      },
    ];
  }
}
