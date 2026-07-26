export { scenarioRegistry } from "./registry";
export { runScenario, runAssertions, buildScenarioResult } from "./runner";
export { calculateHealthScore, scoreToLabel, scoreToColor } from "./scoring";
export { generateBetaReport, summarizeFailures } from "./reporter";
export * from "./assertions";
export type {
  Scenario, ScenarioContext, ScenarioResult, ScenarioCategory, ScenarioStatus,
  Assertion, AssertionResult, AssertionCategory,
  FailureReport, FailureCategory, Severity,
  TimingMetrics, HealthScore, BetaReport, BetaDashboardEntry,
} from "./types";
