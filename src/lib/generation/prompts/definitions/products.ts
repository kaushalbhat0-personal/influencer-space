import type { PromptTemplate } from "../types";

export class Generator {
  generate(): PromptTemplate[] {
    return [
      {
        id: "products.v1",
        stage: "products",
        version: "v1",
        system: "Generate product descriptions for {{creatorName}}'s {{niche}} store.",
        template: "Write a compelling product description for {{productName}}. Category: {{category}}. Price: {{priceRange}}. Niche: {{niche}}. Tone: {{tone}}. Keep under 50 words.",
        variables: [
          { name: "productName", type: "string", required: true, description: "Product name" },
          { name: "category", type: "string", required: true, description: "Product category" },
          { name: "priceRange", type: "string", required: true, description: "Price range" },
          { name: "tone", type: "string", required: true, description: "Brand tone" },
        ],
        maxTokens: 200,
        temperature: 0.7,
      },
    ];
  }
}
