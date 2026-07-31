/* eslint-disable @typescript-eslint/no-explicit-any */
import { GenerationPipeline } from "@/lib/generation/integration/generation-pipeline";
import { GenerationOrchestratorImpl } from "@/lib/generation/orchestration/orchestrator";
import type { GenerationRequest } from "@/lib/generation/contracts";
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { PipelineResult } from "@/lib/generation/integration/types";

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

function createOrchestrator() {
  return new GenerationOrchestratorImpl({
    generationRepository: { create: async (g: any) => ({ success: true, data: g }), update: async (g: any) => ({ success: true, data: g }), findById: async () => ({ success: true, data: null }), findByCreatorId: async () => ({ success: true, data: [] }), findByStatus: async () => ({ success: true, data: [] }), findByIdempotencyKey: async () => ({ success: true, data: null }), delete: async () => ({ success: true, data: undefined }) } as any,
    jobRepository: {} as any,
    checkpointRepository: { save: async () => ({ success: true, data: undefined }), findByGenerationId: async () => ({ success: true, data: [] }), findByStageId: async () => ({ success: true, data: null }), deleteByGenerationId: async () => ({ success: true, data: undefined }) } as any,
    pipelineRunner: { execute: async () => ({ success: true, data: [] }) } as any,
    stageRegistry: { register: () => {}, unregister: () => {}, get: () => undefined, getAll: () => [] } as any,
    cache: { get: async () => ({ success: true, data: null }), set: async () => ({ success: true, data: undefined }), invalidate: async () => ({ success: true, data: undefined }), invalidateByPattern: async () => ({ success: true, data: undefined }), exists: async () => ({ success: true, data: false }) } as any,
    budgetManager: { canSpend: async () => ({ success: true, data: true }), reserve: async () => ({ success: true, data: undefined }), release: async () => ({ success: true, data: undefined }), getRemaining: async () => ({ success: true, data: 100 }), getSystemBudget: async () => ({ success: true, data: 1000 }) } as any,
    costTracker: {} as any,
    metrics: { increment: () => {}, histogram: () => {}, gauge: () => {} } as any,
    events: { publish: async () => ({ success: true, data: undefined }) } as any,
    lockProvider: { acquire: async () => ({ success: true, data: true }), release: async () => ({ success: true, data: undefined }), isLocked: async () => ({ success: true, data: false }) } as any,
    strategyFactory: { register: () => {}, create: () => ({ type: "free" as const, allowsAI: false, maxRegenerationsPerDay: 0, maxAICallsPerGeneration: 0, cacheTTL: 300000, parallelStages: false, budget: { dailyAiCost: 0, monthlyAiCost: 0 }, canRegenerate: () => false, canUseAI: () => false }) } as any,
    aiProviderFactory: { register: () => {}, create: () => { throw new Error("no providers"); }, getDefault: () => { throw new Error("no providers"); }, list: () => [] } as any,
    promptRegistry: { get: () => null, register: () => {}, getAll: () => new Map() } as any,
    queueAdapter: { enqueue: async () => ({ success: true, data: "job1" }), dequeue: async () => ({ success: true, data: null }), complete: async () => ({ success: true, data: undefined }), fail: async () => ({ success: true, data: undefined }), progress: async () => ({ success: true, data: undefined }), getStatus: async () => ({ success: true, data: "queued" }), getDeadLetters: async () => ({ success: true, data: [] }), requeue: async () => ({ success: true, data: undefined }), getQueueDepth: async () => ({ success: true, data: 0 }) } as any,
  });
}

export async function runProvisionPipeline(input: ProvisionPipelineInput, source: ContentSource): Promise<PipelineResult> {
  const orchestrator = createOrchestrator();
  const pipeline = new GenerationPipeline(orchestrator, { publish: async () => {} } as any);
  const idempotencyKey = `${input.idempotencyPrefix}_${input.creatorId}_${Date.now()}`;

  const request: GenerationRequest = {
    sourceUrl: input.sourceUrl,
    creatorId: input.creatorId as any,
    idempotencyKey,
    strategy: input.strategy as any,
    mode: "full",
  };

  return pipeline.runFullPipeline(request, source);
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
}) {
  const { themeData, seoData, heroSection } = extractArtifactData(params.pipelineResult);
  const bp = params.pipelineResult.blueprint;

  return {
    runId: params.runId,
    authenticatedUserId: params.authenticatedUserId,
    mode: params.authenticatedUserId ? "attach_existing_user" as const : undefined,
    creatorName: params.creatorName,
    sourceUrl: params.sourceUrl,
    sourcePlatform: params.sourcePlatform,
    generatedContent: bp ? {
      heroTitle: (heroSection?.props?.headline as string) ?? bp.website.title,
      heroSubtitle: (heroSection?.props?.subheadline as string) ?? "",
      heroCta: (heroSection?.props?.cta as string) ?? "Shop Now",
      aboutSection: (bp.about?.props?.bio as string) ?? "",
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

export function buildPublishSnapshotRecord(pipelineResult: PipelineResult): Record<string, unknown> | null {
  const { storefrontData } = extractArtifactData(pipelineResult);
  const bp = pipelineResult.blueprint;
  if (!storefrontData || !bp) return null;

  return {
    website: { title: (storefrontData.website as any)?.title ?? bp.website.title, tagline: (storefrontData.website as any)?.tagline ?? "" },
    theme: { primary: (storefrontData.theme as any)?.primary ?? "#6366F1", secondary: (storefrontData.theme as any)?.secondary ?? "#818CF8", mode: (storefrontData.theme as any)?.mode ?? "light", fonts: (storefrontData.theme as any)?.fonts ?? {} },
    pages: bp.pages.map((p: any) => ({ id: p.id, type: p.type, title: p.title, slug: p.slug })),
    navigation: { desktop: bp.navigation.desktop },
    sections: bp.sections.map((s: any) => ({ id: s.id, type: s.type, page: s.page, order: s.order, props: s.props })),
    products: bp.products.map((p: any) => ({ id: p.id, name: p.name, type: p.type, priceRange: p.priceRange })),
    gallery: { enabled: bp.gallery.enabled, albums: bp.gallery.albums },
    seo: { title: bp.seo.title, description: bp.seo.description },
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
  const username = url.split("/").filter(Boolean).pop() || creatorName.toLowerCase().replace(/\s+/g, "");
  return {
    platform,
    username,
    displayName: creatorName,
    bio: "",
    avatarUrl: "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: [url],
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
