/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseEvaluationRule } from "./base";
import type { EvaluationContext, EvaluationRuleResult } from "../types";
import type { ArtifactType } from "@/lib/generation/artifacts/types";

export class ArtifactValidationRule extends BaseEvaluationRule {
  readonly id = "technical.artifact_validation";
  readonly category = "technical" as const;
  readonly weight = 20;
  readonly description = "All required artifacts are generated";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const requiredTypes = ["website_record", "theme_record", "pages", "navigation", "sections", "seo", "storefront_json"];
    const artifactTypes = new Set(ctx.artifacts.map((a) => a.manifest.type));
    const missing = requiredTypes.filter((t) => !artifactTypes.has(t as ArtifactType));

    if (missing.length === 0) return this.pass(`All ${requiredTypes.length} required artifacts present`);
    return this.fail(`Missing artifacts: ${missing.join(", ")}`, {
      action: "regenerate", summary: "Generate all required artifacts", details: `The following artifacts are missing: ${missing.join(", ")}. Re-run generation to ensure completeness.`, priority: "high",
    }, missing.length * 5);
  }
}

export class BlueprintValidationRule extends BaseEvaluationRule {
  readonly id = "technical.blueprint_validation";
  readonly category = "technical" as const;
  readonly weight = 15;
  readonly description = "WebsiteBlueprint is valid and complete";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const bp = ctx.blueprint;
    const issues: string[] = [];
    if (!bp.website.title) issues.push("missing title");
    if (!bp.website.domain) issues.push("missing domain");
    if (bp.pages.length === 0) issues.push("no pages");
    if (bp.sections.length === 0) issues.push("no sections");
    if (bp.seo.title.length === 0) issues.push("missing SEO title");

    if (issues.length === 0) return this.pass("Blueprint is valid and complete");
    return this.fail(`Blueprint issues: ${issues.join(", ")}`, {
      action: "regenerate", summary: "Fix blueprint validation errors", details: `Resolve: ${issues.join(", ")} before publishing.`, priority: "high",
    }, issues.length * 5);
  }
}

export class SnapshotCompletenessRule extends BaseEvaluationRule {
  readonly id = "technical.snapshot_completeness";
  readonly category = "technical" as const;
  readonly weight = 15;
  readonly description = "Publish snapshot contains all required data";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const snapshot = ctx.artifacts.find((a) => a.manifest.type === "publish_snapshot");
    if (!snapshot) return this.fail("No publish snapshot generated", { action: "regenerate", summary: "Generate publish snapshot", details: "A publish snapshot is required for deploying the storefront.", priority: "high" });

    const data = snapshot.data as Record<string, unknown> | undefined;
    if (!data || !data.records || typeof data.records !== "object") return this.fail("Snapshot records are empty", { action: "regenerate", summary: "Populate snapshot data", details: "The publish snapshot must contain website, theme, page, and section records.", priority: "high" });

    return this.pass("Publish snapshot is complete");
  }
}

export class RequiredMetadataRule extends BaseEvaluationRule {
  readonly id = "technical.required_metadata";
  readonly category = "technical" as const;
  readonly weight = 10;
  readonly description = "All required metadata fields are present";

  evaluate(ctx: EvaluationContext): EvaluationRuleResult {
    const missing: string[] = [];
    if (!ctx.blueprint.metadata.generatedAt) missing.push("generation timestamp");
    if (!ctx.blueprint.metadata.sourceKey) missing.push("source key");
    if (ctx.blueprint.metadata.version < 1) missing.push("valid version");

    if (missing.length === 0) return this.pass("All required metadata present");
    return this.fail(`Missing metadata: ${missing.join(", ")}`, {
      action: "regenerate", summary: "Add required metadata", details: "Generation metadata is required for tracking and rollback support.", priority: "medium",
    }, missing.length * 5);
  }
}
