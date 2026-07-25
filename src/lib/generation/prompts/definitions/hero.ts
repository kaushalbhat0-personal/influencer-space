import type { PromptTemplate } from "../types";

export class Generator {
  generate(): PromptTemplate[] {
    return [
      {
        id: "hero.v1",
        stage: "hero",
        version: "v1",
        system: "You are a professional copywriter creating hero section content for {{creatorName}}'s {{niche}} store.",
        template: "Write a compelling hero headline and subheadline for a {{niche}} creator's storefront. Creator name: {{creatorName}}. Tone: {{tone}}. Max 10 words for headline, 20 for subheadline. Respond with JSON.",
        variables: [
          { name: "tone", type: "string", required: true, description: "Brand voice tone" },
        ],
        responseFormat: "json_object",
        maxTokens: 200,
        temperature: 0.7,
      },
      {
        id: "hero.v2",
        stage: "hero",
        version: "v2",
        parentId: "hero.v1",
        system: "You are an expert conversion copywriter. Write hero copy for {{creatorName}} — a {{niche}} creator with {{followers}} followers on {{platform}}.",
        template: "Generate: 1) A headline (under 8 words) 2) A subheadline (under 16 words) 3) A CTA button text (2-4 words). Niche: {{niche}}. Tone: {{tone}}. Brand voice: {{brandVoice}}. Respond with JSON.",
        variables: [
          { name: "tone", type: "string", required: true, description: "Brand voice tone" },
          { name: "followers", type: "number", required: true, description: "Follower count" },
          { name: "platform", type: "string", required: true, description: "Source platform" },
          { name: "brandVoice", type: "string", required: false, description: "Brand voice style" },
        ],
        responseFormat: "json_object",
        maxTokens: 300,
        temperature: 0.7,
      },
      {
        id: "hero.v3",
        stage: "hero",
        version: "v3",
        parentId: "hero.v2",
        system: "You are a world-class brand strategist and copywriter. Create premium hero content for {{creatorName}}, a top {{niche}} creator with {{followers}} followers.",
        template: "Generate premium hero section: 1) Power headline (4-7 words) 2) Emotional subheadline (10-15 words) 3) Primary CTA 4) Secondary CTA 5) Social proof line. Niche: {{niche}}. Tone: {{tone}}. Target audience: {{audience}}. Brand voice: {{brandVoice}}. Unique selling point: {{usp}}. Respond with JSON.",
        variables: [
          { name: "tone", type: "string", required: true, description: "Brand voice tone" },
          { name: "followers", type: "number", required: true, description: "Follower count" },
          { name: "brandVoice", type: "string", required: false, description: "Brand voice" },
          { name: "audience", type: "string", required: false, description: "Target audience" },
          { name: "usp", type: "string", required: false, description: "Unique selling point" },
        ],
        responseFormat: "json_object",
        maxTokens: 500,
        temperature: 0.8,
      },
    ];
  }
}
