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

  async importProfile(sourceUrl: string, _creatorId: string, creatorName: string): Promise<ImportProfileResult> {
    // Unified Profile Acquisition — normalize once into the existing ContentSource.
    const acquisition = await profileAcquisitionEngine.acquire(sourceUrl, creatorName);
    const source = acquisition.source;
    const platform = detectPlatform(sourceUrl);

    const knowledgeGraph = this.knowledgeBuilder.build(source);
    const personaMatch = this.personaEngine.detect(knowledgeGraph);
    const experienceProfile = this.experienceProfileBuilder.build(
      knowledgeGraph,
      personaMatch.persona,
      personaMatch.score,
    );

    const channelMeta = acquisition.meta as ImportProfileResult["channelMeta"];
    if (channelMeta) {
      return { platform, knowledgeGraph, personaMatch, experienceProfile, channelMeta, acquisition: acquisition.diagnostics };
    }
    return { platform, knowledgeGraph, personaMatch, experienceProfile, acquisition: acquisition.diagnostics };
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
