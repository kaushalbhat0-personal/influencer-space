import type { GenerationOrchestrator, GenerationRequest, GenerationId, EventPublisher } from "@/lib/generation/contracts";
import type { KnowledgeGraph, ContentSource } from "@/lib/generation/intelligence/types";
import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import { KnowledgeBuilder } from "@/lib/generation/intelligence/knowledge-builder";
import { LayoutComposer } from "@/lib/generation/composition/layout-composer";
import { PersonaEngine, ExperienceProfileBuilder } from "@/lib/generation/persona";
import { ExperiencePlanningEngine } from "@/lib/generation/experience-plan";
import { ArtifactEngine } from "@/lib/generation/artifacts/artifact-engine";
import { ArtifactRegistry } from "@/lib/generation/artifacts/artifact-registry";
import type { Artifact, ArtifactType } from "@/lib/generation/artifacts/types";
import { computeChecksum } from "@/lib/generation/artifacts/types";
import { provisioner } from "./register-generators";
import { VersionHistory } from "./version-history";
import type { VersionEntry, PipelineResult } from "./types";
import { INTEGRATION_EVENTS } from "./integration-events";

export class GenerationPipeline {
  private knowledgeBuilder = new KnowledgeBuilder();
  private layoutComposer = new LayoutComposer();
  private personaEngine = new PersonaEngine();
  private experienceProfileBuilder = new ExperienceProfileBuilder();
  private experiencePlanningEngine = new ExperiencePlanningEngine();
  private artifactEngine: ArtifactEngine;
  private versionHistory = new VersionHistory();

  constructor(
    private orchestrator: GenerationOrchestrator,
    private events: EventPublisher,
  ) {
    const registry = new ArtifactRegistry();
    provisioner(registry);
    this.artifactEngine = new ArtifactEngine(registry);
  }

  async runFullPipeline(
    request: GenerationRequest,
    source: ContentSource,
  ): Promise<PipelineResult> {
    const generationResult = await this.orchestrator.generate(request);
    if (!generationResult.success) {
      return this.emptyResult();
    }
    const genData = generationResult.data;

    const generateResult = this.generateBlueprintAndArtifacts(source, request.idempotencyKey);
    const { blueprint, artifacts } = generateResult;

    const snapshotResult = this.createSnapshotInfo(artifacts);
    const version = this.nextVersion(genData.generationId);

    const versionEntry: VersionEntry = {
      version,
      generationId: genData.generationId,
      blueprintChecksum: computeChecksum(blueprint),
      artifactChecksums: this.buildChecksumMap(artifacts),
      snapshotId: snapshotResult.snapshotId,
      createdAt: new Date().toISOString(),
      reason: "Initial generation",
    };
    this.versionHistory.add(versionEntry);

    await this.publish(INTEGRATION_EVENTS.GENERATION_INTEGRATED, {
      generationId: genData.generationId,
      creatorId: request.creatorId,
      sourceUrl: request.sourceUrl,
      blueprintVersion: version,
      artifactCount: artifacts.length,
      timestamp: new Date().toISOString(),
    });

    return {
      generationResult: genData,
      knowledgeGraph: generateResult.knowledgeGraph,
      blueprint,
      artifacts,
      provisioned: true,
      snapshotId: snapshotResult.snapshotId,
      storefrontUrl: blueprint.website.domain ? `https://${blueprint.website.domain}` : null,
      version,
    };
  }

  async regenerate(
    generationId: GenerationId,
    request: GenerationRequest,
    source: ContentSource,
    previousVersion: number,
  ): Promise<PipelineResult> {
    const result = await this.runFullPipeline(request, source);

    await this.publish(INTEGRATION_EVENTS.GENERATION_REGENERATED, {
      generationId,
      previousVersion,
      newVersion: result.version,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async rollback(generationId: GenerationId, targetVersion: number): Promise<boolean> {
    const entry = this.versionHistory.rollback(generationId, targetVersion);
    if (!entry) return false;

    await this.publish(INTEGRATION_EVENTS.GENERATION_ROLLBACK, {
      generationId,
      fromVersion: targetVersion + 1,
      toVersion: targetVersion,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  getVersionHistory(generationId: string): VersionEntry[] {
    return this.versionHistory.getGenerationHistory(generationId);
  }

  getLatestVersion(generationId: string): VersionEntry | null {
    return this.versionHistory.latest(generationId);
  }

  private generateBlueprintAndArtifacts(source: ContentSource, key: string): {
    knowledgeGraph: KnowledgeGraph;
    blueprint: WebsiteBlueprint;
    artifacts: Artifact[];
  } {
    const knowledgeGraph = this.knowledgeBuilder.build(source);
    const match = this.personaEngine.detect(knowledgeGraph);
    const experienceProfile = this.experienceProfileBuilder.build(knowledgeGraph, match.persona, match.score);
    const experiencePlan = this.experiencePlanningEngine.plan(knowledgeGraph, experienceProfile);
    const blueprint = this.layoutComposer.compose(knowledgeGraph, key, experiencePlan);
    const artifacts = this.artifactEngine.generateAll(blueprint);
    return { knowledgeGraph, blueprint, artifacts };
  }

  private nextVersion(generationId: GenerationId): number {
    const latest = this.versionHistory.latest(generationId);
    return (latest?.version ?? 0) + 1;
  }

  private createSnapshotInfo(artifacts: Artifact[]) {
    const snapshot = artifacts.find((a) => a.manifest.type === "publish_snapshot");
    return {
      snapshotId: snapshot?.manifest.id ?? `snapshot_${Date.now()}`,
      version: snapshot?.manifest.version ?? 1,
      artifactCount: artifacts.length,
      checksum: snapshot?.manifest.checksum ?? "",
      createdAt: snapshot?.manifest.createdAt ?? new Date().toISOString(),
    };
  }

  private buildChecksumMap(artifacts: Artifact[]): Record<ArtifactType, string> {
    const map: Record<string, string> = {};
    for (const a of artifacts) {
      map[a.manifest.type] = a.manifest.checksum;
    }
    return map as Record<ArtifactType, string>;
  }

  private emptyResult(): PipelineResult {
    return {
      generationResult: undefined as unknown as PipelineResult["generationResult"],
      knowledgeGraph: null,
      blueprint: null,
      artifacts: [],
      provisioned: false,
      snapshotId: null,
      storefrontUrl: null,
      version: 0,
    };
  }

  private async publish(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try { await this.events.publish(eventType, payload); } catch {}
  }
}
