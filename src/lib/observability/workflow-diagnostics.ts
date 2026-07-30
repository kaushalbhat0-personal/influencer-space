import { logger } from "./logger";
import { metricsService } from "./metrics-service";
import { captureError } from "./error-tracker";
import type { MetricOperation } from "./metrics-service";
import type { CorrelationContext } from "@/lib/platform/correlation/types";
import { correlationService } from "@/lib/platform/correlation/service";

export type WorkflowName =
  | "provisioning"
  | "publishing"
  | "builder_save"
  | "billing"
  | "generation"
  | "registry_sync"
  | "import"
  | "onboarding";

export interface WorkflowResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
  correlationId: string;
}

export async function runWorkflow<T>(
  workflow: WorkflowName,
  fn: (correlation: CorrelationContext) => Promise<T>,
  correlation?: CorrelationContext,
): Promise<WorkflowResult<T>> {
  const context = correlation || correlationService.create({ workflowId: workflow });
  const start = Date.now();

  logger.info(`Workflow started: ${workflow}`, "workflow", {
    operation: workflow,
    correlation: context,
  });

  try {
    const data = await fn(context);
    const durationMs = Date.now() - start;

    logger.info(`Workflow completed: ${workflow}`, "workflow", {
      operation: workflow,
      correlation: context,
      duration: durationMs,
    });

    metricsService.recordSlowOperation(
      workflow as MetricOperation,
      durationMs,
      getThreshold(workflow),
      { workflow: String(workflow), status: "success", correlationId: context.correlationId },
    );

    return { success: true, data, durationMs, correlationId: context.correlationId };
  } catch (error) {
    const durationMs = Date.now() - start;

    captureError(error, {
      service: "workflow",
      operation: workflow,
      correlation: context,
    });

    metricsService.recordSlowOperation(
      workflow as MetricOperation,
      durationMs,
      getThreshold(workflow),
      { workflow: String(workflow), status: "failure", correlationId: context.correlationId },
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs,
      correlationId: context.correlationId,
    };
  }
}

const THRESHOLDS: Record<WorkflowName, number> = {
  provisioning: 60_000,
  publishing: 30_000,
  builder_save: 10_000,
  billing: 15_000,
  generation: 120_000,
  registry_sync: 30_000,
  import: 60_000,
  onboarding: 120_000,
};

export function getThreshold(workflow: WorkflowName): number {
  return THRESHOLDS[workflow];
}
