import type { Scenario, ScenarioContext, ScenarioResult, AssertionResult, TimingMetrics } from "./types";
import { calculateHealthScore } from "./scoring";

export async function runScenario(
  scenario: Scenario,
  context: ScenarioContext,
): Promise<ScenarioResult> {
  return scenario.execute(context);
}

export async function runAssertions(
  assertions: Array<{ id: string; category: string; description: string; severity: string; check: () => Promise<boolean> | boolean }>,
): Promise<AssertionResult[]> {
  const results: AssertionResult[] = [];

  for (const assertion of assertions) {
    const start = performance.now();
    try {
      const passed = await assertion.check();
      results.push({
        id: assertion.id,
        category: assertion.category as AssertionResult["category"],
        description: assertion.description,
        severity: assertion.severity as AssertionResult["severity"],
        passed,
        durationMs: Math.round(performance.now() - start),
      });
    } catch (error) {
      results.push({
        id: assertion.id,
        category: assertion.category as AssertionResult["category"],
        description: assertion.description,
        severity: assertion.severity as AssertionResult["severity"],
        passed: false,
        actual: String(error),
        durationMs: Math.round(performance.now() - start),
      });
    }
  }

  return results;
}

export function buildScenarioResult(params: {
  scenarioId: string;
  scenarioName: string;
  assertions: AssertionResult[];
  failures: { category: string; message: string; severity: string; assertionId?: string; context?: Record<string, unknown> }[];
  timing: TimingMetrics;
  metadata?: Record<string, unknown>;
}): ScenarioResult {
  const failures = params.failures.map((f) => ({
    category: f.category as Parameters<typeof calculateHealthScore>[1][number]["category"],
    message: f.message,
    severity: f.severity as Parameters<typeof calculateHealthScore>[1][number]["severity"],
    assertionId: f.assertionId,
    context: f.context,
  }));

  const warnings = failures.filter((f) => f.severity === "warning");
  const criticalFailures = failures.filter((f) => f.severity === "critical");
  const status = criticalFailures.length > 0 ? "failed" : "passed";

  return {
    scenarioId: params.scenarioId,
    scenarioName: params.scenarioName,
    status,
    assertions: params.assertions,
    timing: params.timing,
    healthScore: calculateHealthScore(params.assertions, failures),
    failures,
    warnings,
    metadata: params.metadata ?? {},
  };
}
