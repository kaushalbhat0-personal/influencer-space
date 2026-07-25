import type { PromptTemplate } from "../types";

export class Generator {
  generate(): PromptTemplate[] {
    return [
      {
        id: "faq.v1",
        stage: "faq",
        version: "v1",
        system: "Generate FAQ for {{creatorName}}'s {{niche}} store.",
        template: "Generate 3-5 frequently asked questions and answers for a {{niche}} store. Product types: {{products}}. Tone: {{tone}}. Respond with JSON array of {q, a} objects.",
        variables: [
          { name: "products", type: "string", required: false, description: "Product types" },
          { name: "tone", type: "string", required: true, description: "Brand tone" },
        ],
        responseFormat: "json_object",
        maxTokens: 500,
        temperature: 0.6,
      },
    ];
  }
}
