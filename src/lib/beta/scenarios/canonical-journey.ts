import { prisma } from "@/lib/prisma";
import { scenarioRegistry } from "../registry";
import { buildScenarioResult, runAssertions } from "../runner";
import * as A from "../assertions";
import type { ScenarioContext, TimingMetrics } from "../types";

scenarioRegistry.register({
  id: "canonical-creator-journey",
  name: "Canonical Creator Journey",
  description:
    "Validates a complete creator journey: signup → onboarding → generation → provisioning → dashboard → builder → publish → storefront",
  category: "canonical",
  async execute(context: ScenarioContext) {
    if (!context.correlationId) {
      return buildScenarioResult({
        scenarioId: "canonical-creator-journey",
        scenarioName: "Canonical Creator Journey",
        assertions: [],
        failures: [{ category: "infrastructure", message: "correlationId required", severity: "critical" }],
        timing: {},
      });
    }

    const session = await prisma.generationSession.findFirst({
      where: { correlationId: context.correlationId },
    });
    if (!session) {
      return buildScenarioResult({
        scenarioId: "canonical-creator-journey",
        scenarioName: "Canonical Creator Journey",
        assertions: [],
        failures: [{ category: "identity", message: `GenerationSession not found for correlationId: ${context.correlationId}`, severity: "critical" }],
        timing: {},
      });
    }

    const tenantId = session.creatorId;
    const website = tenantId ? await prisma.website.findUnique({ where: { tenantId } }) : null;
    const websiteId = website?.id ?? null;

    const assertions = [
      A.identityAssertion("user-exists", "User account exists", async () => {
        if (!tenantId) return false;
        return A.assertTenantExists(tenantId);
      }),

      A.lifecycleAssertion("website-exists", "Website record exists", async () => {
        if (!tenantId) return false;
        return A.assertWebsiteExists(tenantId);
      }),

      A.generationAssertion("session-completed", "Generation session completed", async () => {
        return session.status === "completed";
      }, "critical"),

      A.provisioningAssertion("workspace-created", "Workspace exists", async () => {
        const workspace = await prisma.workspace.findUnique({ where: { id: session.workspaceId } });
        return !!workspace;
      }),

      A.publishingAssertion("snapshot-exists", "Published snapshot exists", async () => {
        if (!tenantId) return false;
        return A.assertHasPublishedSnapshot(tenantId);
      }, "critical"),

      A.publishingAssertion("publish-status-live", "Publish status is live", async () => {
        if (!websiteId) return false;
        const status = await prisma.publishStatus.findUnique({ where: { websiteId } });
        return status?.state === "live";
      }, "critical"),

      A.storefrontAssertion("storefront-url-set", "Storefront URL is set", async () => {
        return !!session.storefrontUrl;
      }),

      A.storefrontAssertion("storefront-reachable", "Storefront responds", async () => {
        if (!session.storefrontUrl) return false;
        return A.assertStorefrontReachable(session.storefrontUrl);
      }, "warning"),

      A.builderAssertion("builder-url-set", "Builder URL is set", async () => {
        return !!session.builderUrl;
      }),

      A.dashboardAssertion("dashboard-url-set", "Dashboard URL is set", async () => {
        return !!session.dashboardUrl;
      }),

      A.generationAssertion("golden-validation-passed", "Golden validation score exists", async () => {
        return session.goldenValidationScore != null && session.goldenValidationScore > 0.3;
      }, "info"),

      A.performanceAssertion("onboarding-under-3min", "Onboarding completed within 3 minutes", async () => {
        if (!session.completedAt || !session.startedAt) return false;
        const durationMs = session.completedAt.getTime() - session.startedAt.getTime();
        return durationMs < 180000;
      }, "warning"),
    ];

    const results = await runAssertions(assertions);

    const timing: TimingMetrics = {};
    if (session.completedAt && session.startedAt) {
      timing.totalOnboardingMs = session.completedAt.getTime() - session.startedAt.getTime();
    }

    const failures = results
      .filter((r) => !r.passed)
      .map((r) => ({
        category: r.category,
        message: r.description,
        severity: r.severity,
        assertionId: r.id,
      }));

    return buildScenarioResult({
      scenarioId: "canonical-creator-journey",
      scenarioName: "Canonical Creator Journey",
      assertions: results,
      failures,
      timing,
      metadata: {
        persona: session.warnings,
        storefrontUrl: session.storefrontUrl,
        publishVersion: session.artifactVersion,
      },
    });
  },
});
