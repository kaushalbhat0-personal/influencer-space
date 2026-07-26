import type { ScenarioResult, BetaReport, FailureReport } from "./types";

export function generateBetaReport(
  runId: string,
  scenario: ScenarioResult,
  creatorName: string,
): BetaReport {
  const recommendations: string[] = [];

  for (const failure of scenario.failures) {
    if (failure.category === "identity") {
      recommendations.push("Verify user authentication configuration.");
    } else if (failure.category === "generation") {
      recommendations.push("Check generation engine health and API keys.");
    } else if (failure.category === "provisioning") {
      recommendations.push("Review provisioning pipeline and workspace setup.");
    } else if (failure.category === "publishing") {
      recommendations.push("Inspect publishing service and snapshot storage.");
    } else if (failure.category === "storefront") {
      recommendations.push("Verify storefront renderer and CDN cache.");
    } else if (failure.category === "builder") {
      recommendations.push("Check builder data persistence and page loading.");
    } else if (failure.category === "performance") {
      recommendations.push("Review timing metrics for performance bottlenecks.");
    } else if (failure.category === "infrastructure") {
      recommendations.push("Check infrastructure health and resource limits.");
    } else {
      recommendations.push(`Investigate ${failure.category} failure: ${failure.message}`);
    }
  }

  if (scenario.healthScore.overall < 75) {
    recommendations.push("Schedule a full platform health check before onboarding more creators.");
  }

  if (scenario.timing.totalOnboardingMs && scenario.timing.totalOnboardingMs > 180000) {
    recommendations.push("Onboarding duration exceeds 3 minutes. Review generation pipeline performance.");
  }

  return {
    runId,
    createdAt: new Date(),
    scenario,
    creatorName,
    persona: scenario.metadata.persona as string | undefined,
    theme: scenario.metadata.theme as string | undefined,
    storefrontUrl: scenario.metadata.storefrontUrl as string | undefined,
    publishVersion: scenario.metadata.publishVersion as number | undefined,
    recommendations,
  };
}

export function summarizeFailures(failures: FailureReport[]): string {
  if (failures.length === 0) return "No failures";
  const critical = failures.filter((f) => f.severity === "critical").length;
  const warnings = failures.filter((f) => f.severity === "warning").length;
  const infos = failures.filter((f) => f.severity === "info").length;
  const parts: string[] = [];
  if (critical > 0) parts.push(`${critical} critical`);
  if (warnings > 0) parts.push(`${warnings} warnings`);
  if (infos > 0) parts.push(`${infos} info`);
  return parts.join(", ");
}
