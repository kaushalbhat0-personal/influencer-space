import type { PromptTemplate } from "../types";

export class Generator {
  generate(): PromptTemplate[] {
    return [
      {
        id: "cta.v1",
        stage: "cta",
        version: "v1",
        system: "Generate CTAs for {{creatorName}}'s {{niche}} store.",
        template: "Generate 3 call-to-action buttons for a {{niche}} store. Tone: {{tone}}. Purpose: {{purpose}}. Respond with JSON array of strings (2-4 words each).",
        variables: [
          { name: "tone", type: "string", required: true, description: "Brand tone" },
          { name: "purpose", type: "string", required: true, description: "CTA purpose" },
        ],
        responseFormat: "json_object",
        maxTokens: 150,
        temperature: 0.7,
      },
    ];
  }
}
