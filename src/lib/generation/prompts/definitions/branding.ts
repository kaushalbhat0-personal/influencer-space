import type { PromptTemplate } from "../types";

export class Generator {
  generate(): PromptTemplate[] {
    return [
      {
        id: "branding.v1",
        stage: "branding",
        version: "v1",
        system: "Generate brand positioning for {{creatorName}}.",
        template: "Create brand positioning: 1) Tagline (5-8 words) 2) Brand voice description 3) Value proposition. Niche: {{niche}}. Bio: {{bio}}. Tone: {{tone}}. Respond with JSON.",
        variables: [
          { name: "bio", type: "string", required: true, description: "Creator biography" },
          { name: "tone", type: "string", required: true, description: "Brand voice tone" },
        ],
        responseFormat: "json_object",
        maxTokens: 300,
        temperature: 0.7,
      },
    ];
  }
}
