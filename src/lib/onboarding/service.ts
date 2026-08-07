import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { ExperienceProfile, CreatorPersona } from "@/lib/generation/persona/types";
import type { ExperiencePlan } from "@/lib/generation/experience-plan/types";
import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import type { Artifact } from "@/lib/generation/artifacts/types";
import type { PipelineResult, BuilderInitResult } from "@/lib/generation/integration/types";
import type { GoldenValidationResult } from "@/lib/generation/golden/types";

import { KnowledgeBuilder } from "@/lib/generation/intelligence/knowledge-builder";
import { PersonaEngine, ExperienceProfileBuilder } from "@/lib/generation/persona";
import { ExperiencePlanningEngine } from "@/lib/generation/experience-plan";
import { LayoutComposer } from "@/lib/generation/composition/layout-composer";
import { ArtifactEngine } from "@/lib/generation/artifacts/artifact-engine";
import { ArtifactRegistry } from "@/lib/generation/artifacts/artifact-registry";
import { provisioner } from "@/lib/generation/integration/register-generators";
import { GoldenValidator, goldenDataset } from "@/lib/generation/golden";
import { detectPlatform } from "@/lib/generation/integration/provision-pipeline";
import type { ContentSource } from "@/lib/generation/intelligence/types";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import type { AcquisitionDiagnostics } from "@/lib/generation/acquisition/types";
import { hybridIntelligenceEngine } from "@/lib/generation/intelligence/enrichment/engine";
import type { IdentityProfile } from "@/lib/generation/intelligence/enrichment/types";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import type { WebsiteBlueprint as WebsiteIntelligenceBlueprint } from "@/lib/generation/blueprint/types";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";
import type { StorefrontComposition } from "@/lib/generation/intelligence/composition/types";

function acquisitionCompleteness(diagnostics: AcquisitionDiagnostics | undefined): number {
  if (!diagnostics) return 0.5;
  const populated = diagnostics.populatedFields.length;
  const missing = diagnostics.missingFields.length;
  if (populated + missing === 0) return 0.5;
  return populated / (populated + missing);
}

export interface OnboardingProgress {
  state: string;
  progress: number;
  message: string;
  stages: Array<{ stage: string; status: string; error?: string }>;
}

export interface ImportProfileResult {
  platform: string;
  knowledgeGraph: KnowledgeGraph;
  personaMatch: { persona: CreatorPersona; score: number };
  experienceProfile: ExperienceProfile;
  channelMeta?: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    customUrl: string;
    subscriberCount: number;
  } | null;
  /** Unified Profile Acquisition diagnostics (observability only). */
  acquisition?: AcquisitionDiagnostics;
  /** Hybrid Intelligence Enrichment — canonical enriched identity. */
  identityProfile?: IdentityProfile;
  /** IMPLEMENTATION-37 — canonical Website Blueprint (entity-driven storefront). */
  blueprint?: WebsiteIntelligenceBlueprint;
  /** IMPLEMENTATION-38 — executable Storefront Composition (Builder draft). */
  composition?: StorefrontComposition;
}

export interface GenerateResult {
  experiencePlan: ExperiencePlan;
  websiteBlueprint: WebsiteBlueprint;
  artifacts: Artifact[];
}

export interface OnboardingResult {
  success: boolean;
  error?: string;
  pipelineResult?: PipelineResult;
  provisionResult?: {
    tenantId: string;
    workspaceId: string;
    storefrontUrl: string;
    dashboardUrl: string;
  };
  goldenValidation?: GoldenValidationResult | null;
  builderInit?: BuilderInitResult;
  snapshotId?: string;
}

export class OnboardingService {
  private knowledgeBuilder = new KnowledgeBuilder();
  private personaEngine = new PersonaEngine();
  private experienceProfileBuilder = new ExperienceProfileBuilder();
  private experiencePlanningEngine = new ExperiencePlanningEngine();
  private layoutComposer = new LayoutComposer();
  private artifactEngine: ArtifactEngine;

  constructor() {
    const registry = new ArtifactRegistry();
    provisioner(registry);
    this.artifactEngine = new ArtifactEngine(registry);
  }

  async importProfile(sourceUrl: string, _creatorId: string, creatorName: string, onProgress?: (stage: string) => void | Promise<void>): Promise<ImportProfileResult> {
    // Unified Profile Acquisition — normalize once into the existing ContentSource.
    // RCCF-LAUNCH-TRACK-03: report REAL sub-phases so the onboarding UI advances
    // honestly through the network fetch + knowledge build + persona detection
    // instead of sitting on "import_profile" for the whole call.
    await onProgress?.("import_profile");
    const acquisition = await profileAcquisitionEngine.acquire(sourceUrl, creatorName);
    const source = acquisition.source;
    const platform = detectPlatform(sourceUrl);

    await onProgress?.("knowledge_intelligence");
    const knowledgeGraph = this.knowledgeBuilder.build(source);
    await onProgress?.("persona_detection");
    const personaMatch = this.personaEngine.detect(knowledgeGraph);
    await onProgress?.("planning_context");
    const experienceProfile = this.experienceProfileBuilder.build(
      knowledgeGraph,
      personaMatch.persona,
      personaMatch.score,
    );

    // Hybrid Intelligence Enrichment — pure enhancement, never replaces
    // deterministic intelligence. Gated by configurable confidence threshold.
    const identityProfile = await hybridIntelligenceEngine.enrich(
      {
        source,
        graphConfidence: knowledgeGraph.confidence,
        persona: { id: personaMatch.persona.id, name: personaMatch.persona.name },
        personaScore: personaMatch.score,
        primaryNiche: knowledgeGraph.creator.niche || null,
        acquisition: acquisition.diagnostics
          ? {
              capabilities: acquisition.diagnostics.capabilities,
              populatedFields: acquisition.diagnostics.populatedFields,
              missingFields: acquisition.diagnostics.missingFields,
            }
          : null,
      },
      {
        missingFields: acquisition.diagnostics?.missingFields ?? [],
        acquisition: acquisition.diagnostics,
      },
    );

    // IMPLEMENTATION-36: evidence-backed intelligence — multi-entity, multi-niche,
    // business model, audience and recommendations, every conclusion traced to
    // evidence. Deterministic-first; reuses the hybrid AI output (no extra AI call).
    const intelligence = buildEvidenceIntelligence({
      sourceText: source.bio ?? "",
      sourceContentTexts: [
        ...(source.content ?? []).map((c) => c.text ?? ""),
        ...(source.keywords ?? []),
        ...(source.hashtags ?? []),
      ],
      followers: source.followers,
      acquisitionCompleteness: acquisitionCompleteness(acquisition.diagnostics),
      graphNiche: knowledgeGraph.creator.niche || null,
      graphConfidence: knowledgeGraph.confidence,
      aiEntity: identityProfile.entityType,
      aiNiches: identityProfile.primaryNiche ? [identityProfile.primaryNiche, ...identityProfile.secondaryNiches] : identityProfile.secondaryNiches,
      aiBusinessModel: identityProfile.businessModel,
      aiUsed: identityProfile.ai.used,
    });

    const identityWithIntelligence: IdentityProfile = { ...identityProfile, intelligence };

    // IMPLEMENTATION-37: Relationship Intelligence + Website Blueprint.
    // Lightweight knowledge graph (FIFA → Football → Sports → Athlete;
    // Nike → Sponsorship) then the deterministic, versioned Website Blueprint.
    const sourceTexts = [
      source.bio ?? "",
      ...(source.content ?? []).map((c) => c.text ?? ""),
      ...(source.keywords ?? []),
      ...(source.hashtags ?? []),
    ];
    // The acquired platform is strong evidence (youtube → creator, twitch →
    // streamer, instagram → influencer) — feed it into the relationship graph.
    const relationships = buildRelationshipGraph(sourceTexts[0] ?? "", [platform, ...sourceTexts.slice(1)]);
    const blueprint = buildWebsiteBlueprint({
      evidence: intelligence,
      relationships,
      identity: {
        entityType: identityProfile.entityType,
        primaryNiche: intelligence.primaryNiche,
        businessModel: intelligence.businessModels[0]?.model ?? identityProfile.businessModel,
        audience: intelligence.audience.segments.map((a) => a.segment),
        name: source.displayName || source.username,
        username: source.username,
        subdomain: source.username || "creator-store",
      },
    });

    const identityWithBlueprint: IdentityProfile = { ...identityWithIntelligence, blueprint };

    // IMPLEMENTATION-38: executable Storefront Composition — blueprint → Builder
    // Aggregate configuration (deterministic, versioned, zero AI cost).
    const composition = composeStorefront({
      blueprint,
      identity: {
        entityType: identityProfile.entityType,
        name: source.displayName || source.username,
        username: source.username,
        bio: source.bio || null,
        tagline: source.website ?? null,
        avatarUrl: source.avatarUrl || null,
        socialLinks: source.socialLinks ?? source.links ?? [],
        subdomain: source.username || "creator-store",
      },
      evidence: intelligence,
      relationships,
    });

    const identityWithComposition: IdentityProfile = { ...identityWithBlueprint, composition };

    const channelMeta = acquisition.meta as ImportProfileResult["channelMeta"];
    const base = { platform, knowledgeGraph, personaMatch, experienceProfile, acquisition: acquisition.diagnostics, identityProfile: identityWithComposition, blueprint, composition };
    if (channelMeta) {
      return { ...base, channelMeta };
    }
    return base;
  }

  async generate(knowledgeGraph: KnowledgeGraph, experienceProfile: ExperienceProfile): Promise<GenerateResult> {
    const experiencePlan = this.experiencePlanningEngine.plan(knowledgeGraph, experienceProfile);
    const websiteBlueprint = this.layoutComposer.compose(knowledgeGraph, `${Date.now()}`, experiencePlan);
    const artifacts = this.artifactEngine.generateAll(websiteBlueprint);
    return { experiencePlan, websiteBlueprint, artifacts };
  }

  async validateGolden(url: string, experienceProfile: ExperienceProfile): Promise<GoldenValidationResult | null> {
    if (!goldenDataset.isKnownUrl(url)) return null;
    return new GoldenValidator().validateByUrl(url, experienceProfile);
  }
}

export const onboardingService = new OnboardingService();
