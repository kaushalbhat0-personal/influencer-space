/**
 * AI Content Generator v1.0.0
 *
 * Generates website copy (hero, about, CTA, SEO) from creator profiles.
 * Structured for future LLM integration — today uses template-based generation.
 */

import { BaseAppService } from "@/lib/application/base";
import type { ServiceResult } from "@/lib/application/types";
import type {
  CreatorProfile,
  CreatorContent,
  GeneratedContent,
  SuggestedSection,
} from "./types";

export class ContentGenerationService extends BaseAppService {
  constructor() {
    super("ContentGenerationService");
  }

  generate(
    profile: CreatorProfile,
    content: CreatorContent
  ): ServiceResult<GeneratedContent> {
    try {
      const niche = profile.niche.charAt(0).toUpperCase() + profile.niche.slice(1);
      const name = profile.name;

      const heroTitle = this.heroTitleForNiche(name, niche);
      const heroSubtitle = this.heroSubtitleForNiche(name, niche, content);
      const heroCta = this.ctaForNiche(niche);
      const aboutSection = this.aboutForProfile(profile);
      const tagline = this.taglineForNiche(name, niche);
      const seoTitle = `${name} — ${profile.category} Creator | Official Website`;
      const seoDescription = `${name} is a ${niche} creator. ${profile.bio.substring(0, 120)}`;
      const keywords = [niche.toLowerCase(), "creator", "content", profile.platform, ...content.contentThemes];
      const suggestedSections = this.suggestedSectionsForNiche(niche);

      return this.success({
        heroTitle,
        heroSubtitle,
        heroCta,
        aboutSection,
        tagline,
        seoTitle,
        seoDescription,
        keywords,
        suggestedSections,
      });
    } catch (error) {
      return this.failed(error, "GeneratedContent");
    }
  }

  private heroTitleForNiche(name: string, niche: string): string {
    const templates: Record<string, string[]> = {
      Gaming: [`${name}'s Gaming Universe`, `Welcome to ${name}'s Stream`, `Game With ${name}`],
      Music: [`${name}'s Music`, `Listen to ${name}`, `${name} — Official Music`],
      Technology: [`${name}'s Tech Hub`, `Explore Tech with ${name}`, `${name} Reviews`],
      Fitness: [`${name}'s Fitness Journey`, `Train With ${name}`, `${name} Fitness`],
      Lifestyle: [`Welcome to ${name}'s World`, `${name} — Lifestyle & More`, `Follow ${name}`],
      Food: [`${name}'s Kitchen`, `Cook With ${name}`, `${name} — Official Food Channel`],
      Travel: [`${name}'s Travels`, `Explore With ${name}`, `${name} Adventure`],
      Beauty: [`${name}'s Beauty Studio`, `Glow With ${name}`, `${name} Beauty`],
      Fashion: [`${name}'s Style`, `Wear ${name}`, `${name} Fashion`],
      Photography: [`${name}'s Lens`, `See Through ${name}'s Eyes`, `${name} Photography`],
      Entertainment: [`${name}'s World`, `Welcome to ${name}`, `The ${name} Experience`],
      Education: [`Learn With ${name}`, `${name}'s Classroom`, `Grow With ${name}`],
      Comedy: [`Laugh With ${name}`, `${name}'s Comedy Club`, `${name} — Official`],
      Sports: [`${name}'s Game`, `Play With ${name}`, `${name} Sports`],
      Art: [`${name}'s Gallery`, `Create With ${name}`, `${name} Art`],
    };

    const options = templates[niche] ?? [`Welcome to ${name}'s Website`, `${name} — Official Site`, `Discover ${name}`];
    return options[0]!;
  }

  private heroSubtitleForNiche(
    name: string,
    niche: string,
    content: CreatorContent
  ): string {
    const postCount = content.totalPosts;
    const theme = content.contentThemes[0] ?? niche.toLowerCase();
    const prefixes: Record<string, string> = {
      Gaming: `Watch ${name}'s latest gameplay, highlights, and ${theme} content.`,
      Music: `Stream ${name}'s latest tracks, albums, and ${theme} projects.`,
      Technology: `Dive into ${name}'s reviews, tutorials, and ${theme} insights.`,
      Fitness: `Join ${name} for workouts, tips, and ${theme} programs.`,
      Lifestyle: `Follow ${name}'s daily life, tips, and ${theme} inspiration.`,
      Food: `Discover ${name}'s recipes, reviews, and ${theme} creations.`,
      Travel: `Journey with ${name} through destinations and ${theme} experiences.`,
      Beauty: `Explore ${name}'s tutorials, reviews, and ${theme} secrets.`,
      Fashion: `Shop ${name}'s looks, trends, and ${theme} inspiration.`,
      Photography: `Browse ${name}'s portfolio, tips, and ${theme} captures.`,
    };

    return prefixes[niche] ?? `${name}'s latest ${theme} content — ${postCount}+ posts and growing.`;
  }

  private ctaForNiche(niche: string): string {
    const ctas: Record<string, string> = {
      Gaming: "Watch Now",
      Music: "Listen Now",
      Technology: "Explore",
      Fitness: "Start Training",
      Lifestyle: "Follow Along",
      Food: "Get Recipes",
      Travel: "Start Exploring",
      Beauty: "Watch Tutorials",
      Fashion: "Shop Style",
    };
    return ctas[niche] ?? "Learn More";
  }

  private aboutForProfile(profile: CreatorProfile): string {
    const platformLabel: Record<string, string> = {
      youtube: "YouTube creator",
      instagram: "Instagram creator",
      tiktok: "TikTok creator",
      manual: "content creator",
    };

    const label = platformLabel[profile.platform] ?? "creator";
    return `${profile.name} is a ${label} creating content about ${profile.niche}. ${profile.bio}`;
  }

  private taglineForNiche(name: string, niche: string): string {
    const taglines: Record<string, string> = {
      Gaming: `${name} — Let's Play`,
      Music: `${name} — The Sound You Love`,
      Technology: `${name} — Tech Simplified`,
      Fitness: `${name} — Your Fitness Partner`,
      Lifestyle: `${name} — Live Better`,
      Food: `${name} — Taste the Difference`,
      Travel: `${name} — Wander More`,
      Beauty: `${name} — Beauty Reimagined`,
    };
    return taglines[niche] ?? `${name} — ${niche} Creator`;
  }

  private suggestedSectionsForNiche(niche: string): SuggestedSection[] {
    const sectionMap: Record<string, SuggestedSection[]> = {
      Gaming: [
        { type: "products", priority: 1, reason: "Gear & merchandise", prePopulated: true },
        { type: "gallery", priority: 2, reason: "Game highlights", prePopulated: true },
        { type: "links", priority: 3, reason: "Social & streaming", prePopulated: true },
        { type: "games", priority: 4, reason: "Featured games", prePopulated: false },
      ],
      Music: [
        { type: "gallery", priority: 1, reason: "Album art & photos", prePopulated: true },
        { type: "products", priority: 2, reason: "Merch", prePopulated: true },
        { type: "links", priority: 3, reason: "Streaming links", prePopulated: true },
      ],
      Technology: [
        { type: "products", priority: 1, reason: "Recommended gear", prePopulated: true },
        { type: "links", priority: 2, reason: "Resources & tools", prePopulated: true },
      ],
      Lifestyle: [
        { type: "gallery", priority: 1, reason: "Photo collection", prePopulated: true },
        { type: "links", priority: 2, reason: "Social links", prePopulated: true },
        { type: "products", priority: 3, reason: "Favorites", prePopulated: false },
      ],
    };

    return sectionMap[niche] ?? [
      { type: "gallery", priority: 1, reason: "Media showcase", prePopulated: true },
      { type: "links", priority: 2, reason: "All links", prePopulated: true },
      { type: "products", priority: 3, reason: "Featured items", prePopulated: false },
    ];
  }
}

export const contentGenerationService = new ContentGenerationService();
