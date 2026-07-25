import type { PromptTemplate } from "../types";

export class Generator {
  generate(): PromptTemplate[] {
    return [
      {
        id: "about.v1",
        stage: "about",
        version: "v1",
        system: "Write an about section for {{creatorName}}'s {{niche}} store.",
        template: "Write a short about section (2-3 sentences) for {{creatorName}}, a {{niche}} creator. Creator background: {{bio}}. Tone: {{tone}}.",
        variables: [
          { name: "bio", type: "string", required: true, description: "Creator biography" },
          { name: "tone", type: "string", required: true, description: "Brand voice tone" },
        ],
        maxTokens: 200,
        temperature: 0.7,
      },
      {
        id: "about.v2",
        stage: "about",
        version: "v2",
        parentId: "about.v1",
        system: "You are a brand storyteller. Create a compelling about section for {{creatorName}}.",
        template: "Craft an about section: 1) Opening hook 2) Creator journey ({{bio}}) 3) Mission statement 4) Brand promise. Niche: {{niche}}. Tone: {{tone}}. Audience: {{audience}}. Voice: {{brandVoice}}. Respond with JSON.",
        variables: [
          { name: "bio", type: "string", required: true, description: "Creator biography" },
          { name: "tone", type: "string", required: true, description: "Brand voice tone" },
          { name: "audience", type: "string", required: false, description: "Target audience" },
          { name: "brandVoice", type: "string", required: false, description: "Brand voice" },
        ],
        responseFormat: "json_object",
        maxTokens: 400,
        temperature: 0.7,
      },
    ];
  }
}
