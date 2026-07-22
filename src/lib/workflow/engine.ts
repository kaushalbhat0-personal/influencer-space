import { prisma } from "@/lib/prisma";
import { triggerRegistry } from "./triggers/registry";
import { actionRegistry } from "./actions/registry";
import type { TriggerContext } from "./triggers/interface";
import type { ActionContext } from "./actions/interface";

export interface WorkflowEvent {
  trigger: string;
  tenantId?: string;
  entityId?: string;
  data: Record<string, unknown>;
}

export class WorkflowEngine {
  /**
   * Fire an event — matches workflows, executes their actions, records history.
   */
  async fire(event: WorkflowEvent): Promise<void> {
    const trigger = triggerRegistry.get(event.trigger);
    if (!trigger) return; // No trigger registered for this event

    // Find enabled workflows matching this trigger
    const workflows = await prisma.workflow.findMany({
      where: { enabled: true, trigger: event.trigger },
    });

    for (const workflow of workflows) {
      // Check tenant match
      if (workflow.tenantId && event.tenantId && workflow.tenantId !== event.tenantId) {
        continue;
      }

      // Check trigger condition
      const context: TriggerContext = {
        tenantId: event.tenantId,
        entityId: event.entityId,
        data: event.data,
      };

      if (!trigger.match(context)) continue;

      // Create execution record
      const execution = await prisma.workflowExecution.create({
        data: JSON.parse(JSON.stringify({
          workflowId: workflow.id,
          tenantId: workflow.tenantId || event.tenantId || "",
          trigger: event.trigger,
          status: "running",
          actions: workflow.actions,
          maxRetries: 1,
        })),
      });

      // Execute actions sequentially
      const results: { action: string; success: boolean; durationMs: number; error?: string }[] = [];
      const actionList = workflow.actions as Array<{ id: string; config?: Record<string, unknown> }>;
      let overallSuccess = true;

      for (const actionDef of actionList) {
        const action = actionRegistry.get(actionDef.id);
        if (!action) {
          results.push({ action: actionDef.id, success: false, durationMs: 0, error: `Unknown action: ${actionDef.id}` });
          overallSuccess = false;
          continue;
        }

        const actionContext: ActionContext = {
          tenantId: event.tenantId,
          entityId: event.entityId,
          trigger: event.trigger,
          data: event.data,
          config: actionDef.config || {},
        };

        const t0 = performance.now();
        try {
          const result = await action.execute(actionContext);
          results.push({ action: actionDef.id, success: result.success, durationMs: Math.round(performance.now() - t0), error: result.message });
          if (!result.success) overallSuccess = false;
        } catch (error) {
          results.push({ action: actionDef.id, success: false, durationMs: Math.round(performance.now() - t0), error: String(error) });
          overallSuccess = false;
        }
      }

      // Update execution record
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: overallSuccess ? "completed" : "failed",
          results: JSON.parse(JSON.stringify(results)),
          durationMs: Math.round(Date.now() - execution.createdAt.getTime()),
          completedAt: new Date(),
        },
      });
    }
  }
}

export const workflowEngine = new WorkflowEngine();
