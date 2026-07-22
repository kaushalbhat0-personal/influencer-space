import { promptRegistry } from "@/lib/ai/prompts/registry";
import { HeroContentSchema, AboutContentSchema, FaqContentSchema, SeoContentSchema, CtaContentSchema, NewsletterContentSchema, TestimonialContentSchema, PricingContentSchema, LinksContentSchema, ContactContentSchema } from "./schemas";

function buildSystemPrompt(schema: string): string {
  return `You are a Content Studio AI for CreatorStore.
Generate structured content for a creator's website section.
Output ONLY valid JSON matching the schema below.
No markdown, no explanations.

Schema:
${schema}

Rules:
- Be specific to this creator's niche and audience
- Use the creator intelligence to inform tone and style
- Never invent facts not present in the profile
- Keep content concise and actionable
- Match the JSON schema exactly`;
}

function buildUserPrompt(profileName: string, description: string, intelligence: string): string {
  return `Creator: ${profileName}
Description: ${description}
Intelligence: ${intelligence}

Generate the content now.`;
}

const VERSION = "v1.0.0";

// Register all content generator prompts
export function registerContentPrompts(): void {
  const generators = [
    { id: "hero", schema: JSON.stringify(HeroContentSchema.shape, null, 2), count: 4 },
    { id: "about", schema: JSON.stringify(AboutContentSchema.shape, null, 2), count: 3 },
    { id: "faq", schema: JSON.stringify(FaqContentSchema.shape, null, 2), count: 2 },
    { id: "seo", schema: JSON.stringify(SeoContentSchema.shape, null, 2), count: 3 },
    { id: "cta", schema: JSON.stringify(CtaContentSchema.shape, null, 2), count: 4 },
    { id: "newsletter", schema: JSON.stringify(NewsletterContentSchema.shape, null, 2), count: 3 },
    { id: "testimonials", schema: JSON.stringify(TestimonialContentSchema.shape, null, 2), count: 3 },
    { id: "pricing", schema: JSON.stringify(PricingContentSchema.shape, null, 2), count: 4 },
    { id: "links", schema: JSON.stringify(LinksContentSchema.shape, null, 2), count: 3 },
    { id: "contact", schema: JSON.stringify(ContactContentSchema.shape, null, 2), count: 3 },
  ];

  for (const gen of generators) {
    promptRegistry.register({
      id: `content:${gen.id}`,
      version: VERSION,
      description: `Generate ${gen.id} section content from creator profile and intelligence`,
      build: (profile) => {
        const intel = [
          `niche: ${profile.name}`,
          `keywords: ${profile.keywords?.join(", ") || ""}`,
        ].join("\n");

        return {
          version: VERSION,
          messages: [
            { role: "system", content: buildSystemPrompt(gen.schema) },
            { role: "user", content: buildUserPrompt(profile.name, profile.description || "", intel) },
          ],
        };
      },
    });
  }
}
