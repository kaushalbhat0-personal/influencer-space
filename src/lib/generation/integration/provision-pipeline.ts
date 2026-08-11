/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { PipelineResult } from "@/lib/generation/integration/types";
import type { ImportProfileResult } from "@/lib/onboarding/service";

export interface ProvisionPipelineInput {
  sourceUrl: string;
  creatorId: string;
  creatorName: string;
  idempotencyPrefix: string;
  strategy: string;
}

export interface PipelineArtifactData {
  storefrontData: Record<string, unknown> | undefined;
  themeData: Record<string, unknown> | undefined;
  seoData: Record<string, unknown> | undefined;
  heroSection: { props?: { headline?: string; subheadline?: string; cta?: string } } | undefined;
}

/**
 * Run the REAL onboarding generation pipeline (acquisition → knowledge →
 * persona → experience → confidence-gated AI enrichment → WebsiteBlueprint →
 * LayoutComposer → ArtifactEngine). This replaces the previous fully-mocked
 * orchestrator: the existing provider infrastructure (env-key gated) is reused
 * and the confidence-gated deterministic fallback is preserved. No parallel
 * generation system — this is the same path creator onboarding uses.
 */
export async function runProvisionPipeline(input: ProvisionPipelineInput, _source?: ContentSource): Promise<PipelineResult> {
  const { onboardingService } = await import("@/lib/onboarding/service");
  const profile: ImportProfileResult = await onboardingService.importProfile(input.sourceUrl, input.creatorId, input.creatorName);
  const generated = await onboardingService.generate(profile.knowledgeGraph, profile.experienceProfile);

  const blueprint = generated.websiteBlueprint ?? null;

  return {
    generationResult: undefined as never,
    knowledgeGraph: profile.knowledgeGraph,
    blueprint,
    artifacts: generated.artifacts ?? [],
    provisioned: !!blueprint,
    snapshotId: null,
    storefrontUrl: blueprint?.website?.domain ? `https://${blueprint.website.domain}` : null,
    version: blueprint?.metadata?.version ?? 1,
  };
}

export function extractArtifactData(pipelineResult: PipelineResult): PipelineArtifactData {
  if (!pipelineResult.blueprint || pipelineResult.artifacts.length === 0) {
    return { storefrontData: undefined, themeData: undefined, seoData: undefined, heroSection: undefined };
  }

  const storefrontData = pipelineResult.artifacts.find((a) => a.manifest.type === "storefront_json")?.data as Record<string, unknown> | undefined;
  const themeData = pipelineResult.artifacts.find((a) => a.manifest.type === "theme_record")?.data as Record<string, unknown> | undefined;
  const seoData = pipelineResult.artifacts.find((a) => a.manifest.type === "seo")?.data as Record<string, unknown> | undefined;
  const heroSection = ((storefrontData?.sections as any[]) ?? []).find((s: any) => s.type === "hero");

  return { storefrontData, themeData, seoData, heroSection };
}

export function buildProvisioningInput(params: {
  runId: string;
  authenticatedUserId?: string;
  creatorName: string;
  sourceUrl: string;
  sourcePlatform: string;
  planCode: string;
  pipelineResult: PipelineResult;
  category?: string;
  industry?: string;
}) {
  const { themeData, seoData, heroSection } = extractArtifactData(params.pipelineResult);
  const bp = params.pipelineResult.blueprint;
  const builderData = buildBuilderArtifactData(params.pipelineResult);

  const base = {
    creatorName: params.creatorName,
    sourceUrl: params.sourceUrl,
    sourcePlatform: params.sourcePlatform,
    category: params.category,
    industry: params.industry,
    generatedContent: bp ? {
      heroTitle: (heroSection?.props?.headline as string) ?? bp.website.title,
      heroSubtitle: (heroSection?.props?.subheadline as string) ?? "",
      heroCta: (heroSection?.props?.cta as string) ?? "Shop Now",
      // IMPLEMENTATION-19: About removed — creator bio lives in Hero.
      aboutSection: ((heroSection?.props as Record<string, unknown>)?.bio as string) ?? "",
      tagline: bp.website.tagline,
      seoTitle: (seoData?.title as string) ?? bp.seo.title,
      seoDescription: (seoData?.description as string) ?? bp.seo.description,
      keywords: (seoData?.keywords as string[]) ?? bp.seo.keywords,
    } : undefined,
    generatedTheme: themeData ? {
      preset: "custom",
      colors: { primary: themeData.primary as string, secondary: themeData.secondary as string, accent: themeData.accent as string },
      fontFamily: ((themeData as any)?.fonts?.heading) as string ?? "Inter",
      layoutDensity: "standard",
      darkMode: (themeData as any)?.mode === "dark",
    } : undefined,
    // RCCF-01: carry the generated website structure (sections + navigation)
    // so provisioning can persist the generated blueprint as canonical
    // Page/Section/Block rows instead of the generic template.
    generatedWebsite: builderData ? {
      sections: ((builderData.sections as Array<{ type: string; props: Record<string, unknown> }>) ?? []),
      navigation: builderData.navigation as Record<string, unknown> | undefined,
      theme: builderData.theme as Record<string, unknown> | undefined,
      metadata: builderData.metadata as Record<string, unknown> | undefined,
    } : undefined,
  };

  if (params.authenticatedUserId) {
    return {
      ...base,
      runId: params.runId,
      mode: "attach_existing_user" as const,
      authenticatedUserId: params.authenticatedUserId,
    };
  }

  return {
    ...base,
    runId: params.runId,
    mode: "create_new_admin" as const,
  };
}

export function buildBuilderArtifactData(pipelineResult: PipelineResult): Record<string, unknown> | null {
  const { storefrontData } = extractArtifactData(pipelineResult);
  if (!storefrontData) return null;

  return {
    sections: ((storefrontData.sections as any[]) ?? []).map((s: any) => ({ id: s.id, type: s.type, props: s.props })),
    navigation: storefrontData.navigation,
    theme: storefrontData.theme,
    metadata: storefrontData.metadata,
  };
}

export function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("youtube") || lower.includes("youtu.be")) return "youtube";
  if (lower.includes("instagram")) return "instagram";
  if (lower.includes("tiktok")) return "tiktok";
  if (lower.includes("linkedin")) return "linkedin";
  if (lower.includes("twitch")) return "twitch";
  if (lower.includes("x.com") || lower.includes("twitter")) return "twitter";
  return "manual";
}

export function buildContentSource(url: string, platform: string, creatorName: string): ContentSource {
  // VALIDATION-01 V-006: "Build with AI" sends free text (not a URL) — treat it
  // as the creator's description/bio instead of a bogus username/link.
  const isFreeText = !/^https?:\/\//i.test(url) && !url.includes(".");
  const username = isFreeText
    ? creatorName.toLowerCase().replace(/\s+/g, "")
    : url.split("/").filter(Boolean).pop() || creatorName.toLowerCase().replace(/\s+/g, "");
  return {
    platform,
    username,
    displayName: creatorName,
    bio: isFreeText ? url : "",
    avatarUrl: "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: isFreeText ? [] : [url],
  };
}

export function buildContentSourceFromYouTube(
  url: string,
  channelMeta: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    customUrl: string;
    subscriberCount: number;
  },
): ContentSource {
  return {
    platform: "youtube",
    username: channelMeta.customUrl.replace(/^@/, "") || channelMeta.id,
    displayName: channelMeta.title,
    bio: channelMeta.description.slice(0, 500),
    avatarUrl: channelMeta.thumbnailUrl,
    followers: channelMeta.subscriberCount,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: [url, `https://youtube.com/${channelMeta.customUrl}`],
  };
}
