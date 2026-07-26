export type ScenarioCategory = "canonical" | "failure" | "edge-case" | "agency" | "performance";

export type ScenarioStatus = "passed" | "failed" | "skipped" | "running";

export type AssertionCategory =
  | "identity"
  | "lifecycle"
  | "generation"
  | "provisioning"
  | "publishing"
  | "storefront"
  | "builder"
  | "dashboard"
  | "navigation"
  | "permissions"
  | "performance"
  | "infrastructure";

export type FailureCategory = AssertionCategory;

export type Severity = "critical" | "warning" | "info";

export interface ScenarioContext {
  correlationId: string;
  creatorName?: string;
  sourceUrl?: string;
  platform?: string;
}

export interface Assertion {
  id: string;
  category: AssertionCategory;
  description: string;
  severity: Severity;
  check: () => Promise<boolean> | boolean;
}

export interface AssertionResult {
  id: string;
  category: AssertionCategory;
  description: string;
  severity: Severity;
  passed: boolean;
  actual?: unknown;
  expected?: unknown;
  durationMs: number;
}

export interface TimingMetrics {
  signupMs?: number;
  generationMs?: number;
  provisioningMs?: number;
  publishingMs?: number;
  totalOnboardingMs?: number;
  storefrontResponseMs?: number;
  dashboardLoadMs?: number;
  builderLoadMs?: number;
}

export interface FailureReport {
  category: FailureCategory;
  message: string;
  severity: Severity;
  assertionId?: string;
  context?: Record<string, unknown>;
}

export interface HealthScore {
  overall: number;
  categories: Partial<Record<AssertionCategory, number>>;
}

export interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  status: ScenarioStatus;
  assertions: AssertionResult[];
  timing: TimingMetrics;
  healthScore: HealthScore;
  failures: FailureReport[];
  warnings: FailureReport[];
  metadata: Record<string, unknown>;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: ScenarioCategory;
  execute(context: ScenarioContext): Promise<ScenarioResult>;
}

export interface BetaReport {
  runId: string;
  createdAt: Date;
  scenario: ScenarioResult;
  creatorName: string;
  persona?: string;
  theme?: string;
  storefrontUrl?: string;
  publishVersion?: number;
  recommendations: string[];
}

export interface BetaDashboardEntry {
  id: string;
  creatorName: string;
  currentStage: string;
  persona: string;
  theme: string;
  hasSnapshot: boolean;
  publishVersion: number | null;
  storefrontUrl: string | null;
  durationMs: number;
  status: string;
  healthScore: number;
  correlationId: string | null;
  tenantId: string | null;
  websiteId: string | null;
  createdAt: Date;
}
