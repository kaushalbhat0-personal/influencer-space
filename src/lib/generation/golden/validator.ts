import type { ExperienceProfile } from "../persona/types";
import type { GoldenCreatorEntry, GoldenValidationResult, GoldenValidationDimension } from "./types";
import { goldenDataset } from "./registry";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function compareValues(
  dimension: string,
  expected: string,
  actual: string,
): GoldenValidationDimension {
  const normalizedExpected = normalize(expected);
  const normalizedActual = normalize(actual);
  const exactMatch = normalizedExpected === normalizedActual;
  const partialMatch = !exactMatch &&
    (normalizedActual.includes(normalizedExpected) ||
      normalizedExpected.includes(normalizedActual));
  const score = exactMatch ? 1 : partialMatch ? 0.5 : 0;
  return { dimension, expected, actual, match: exactMatch, score };
}

export class GoldenValidator {
  validate(
    entry: GoldenCreatorEntry,
    profile: ExperienceProfile,
  ): GoldenValidationResult {
    const dimensions: GoldenValidationDimension[] = [];

    dimensions.push(
      compareValues("persona", entry.expectedPersonaId, profile.persona.id),
    );
    dimensions.push(
      compareValues(
        "persona_name",
        entry.expectedPersonaName,
        profile.persona.name,
      ),
    );
    dimensions.push(
      compareValues(
        "business_model",
        entry.expectedBusinessModel,
        profile.businessModel,
      ),
    );
    dimensions.push(
      compareValues(
        "creator_stage",
        entry.expectedCreatorStage,
        profile.creatorStage,
      ),
    );
    dimensions.push(
      compareValues(
        "content_style",
        entry.expectedContentStyle,
        profile.contentStyle,
      ),
    );
    dimensions.push(
      compareValues(
        "audience_type",
        entry.expectedAudienceType,
        profile.audienceType,
      ),
    );
    dimensions.push(
      compareValues(
        "brand_strength",
        entry.expectedBrandStrength,
        profile.brandStrength,
      ),
    );
    dimensions.push(
      compareValues(
        "commerce_stage",
        entry.expectedCommerceStage,
        profile.commerceStage,
      ),
    );

    const totalScore =
      dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;
    const overallScore = Math.round(totalScore * 100) / 100;
    const passed = goldenDataset.config.strictMode
      ? overallScore >= 1
      : overallScore >= goldenDataset.config.scoreThreshold;
    const regressions = dimensions
      .filter((d) => d.score < 0.5)
      .map((d) => `${d.dimension}: expected "${d.expected}", got "${d.actual}"`);

    return {
      creatorId: entry.id,
      creatorName: entry.name,
      url: entry.url,
      passed,
      overallScore,
      dimensions,
      timestamp: new Date().toISOString(),
      regressions,
    };
  }

  validateByUrl(
    url: string,
    profile: ExperienceProfile,
  ): GoldenValidationResult | null {
    const entry = goldenDataset.findByUrl(url);
    if (!entry) return null;
    return this.validate(entry, profile);
  }

  generateReport(
    results: GoldenValidationResult[],
  ): string {
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const avgScore =
      results.reduce((sum, r) => sum + r.overallScore, 0) / total;
    const allRegressions = results.flatMap((r) => r.regressions);

    const lines: string[] = [
      "=== Golden Dataset Validation Report ===",
      `Timestamp: ${new Date().toISOString()}`,
      `Total: ${total} | Passed: ${passed} | Failed: ${failed}`,
      `Average Score: ${(avgScore * 100).toFixed(1)}%`,
      "",
    ];

    if (allRegressions.length > 0) {
      lines.push("Regressions:");
      for (const regression of allRegressions) {
        lines.push(`  - ${regression}`);
      }
      lines.push("");
    }

    for (const result of results) {
      const status = result.passed ? "PASS" : "FAIL";
      lines.push(
        `[${status}] ${result.creatorName} (${(result.overallScore * 100).toFixed(0)}%)`,
      );
    }

    return lines.join("\n");
  }
}

export const goldenValidator = new GoldenValidator();
