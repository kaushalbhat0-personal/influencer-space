import type {
  WorkflowInstance,
  WorkflowHandler,
  WorkflowStatus,
  StateTransitionEvent,
  WorkflowExecutionResult,
} from "./types";
import { WorkflowStateMachine } from "./state-machine";
import { WorkflowRegistry } from "./registry";
import {
  WorkflowEventDispatcher,
  createWorkflowStartedEvent,
  createWorkflowStateChangedEvent,
  createWorkflowCompletedEvent,
  createWorkflowFailedEvent,
} from "./events";

export class WorkflowEngine {
  private readonly registry: WorkflowRegistry;
  private readonly events: WorkflowEventDispatcher;
  private readonly instances: Map<string, WorkflowInstance> = new Map();
  private readonly machines: Map<string, WorkflowStateMachine> = new Map();
  private idCounter = 0;

  constructor(registry: WorkflowRegistry, events: WorkflowEventDispatcher) {
    this.registry = registry;
    this.events = events;
  }

  get eventDispatcher(): WorkflowEventDispatcher {
    return this.events;
  }

  start(
    definitionId: string,
    context: Readonly<Record<string, unknown>> = {}
  ): WorkflowInstance {
    const handler = this.registry.lookup(definitionId);
    if (!handler) {
      throw new Error(`Workflow "${definitionId}" not found in registry`);
    }

    const instanceId = this.generateId();
    const now = new Date();
    const machine = new WorkflowStateMachine(handler.definition);

    const instance: WorkflowInstance = Object.freeze({
      id: instanceId,
      definitionId: handler.id,
      currentState: handler.definition.initialState,
      status: "running" as WorkflowStatus,
      context: Object.freeze({ ...context }),
      history: Object.freeze([]),
      startedAt: now,
      updatedAt: now,
      completedAt: null,
      retryCount: 0,
      maxRetries: handler.definition.retryConfig?.maxRetries ?? 3,
      error: null,
    });

    this.instances.set(instanceId, instance);
    this.machines.set(instanceId, machine);

    this.events.emit(
      createWorkflowStartedEvent(instanceId, handler.id, instance.currentState)
    );

    return instance;
  }

  async transition(
    instanceId: string,
    trigger: string
  ): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Workflow instance "${instanceId}" not found`);
    }

    if (instance.status === "completed") {
      throw new Error(
        `Cannot transition completed workflow instance "${instanceId}"`
      );
    }

    if (instance.status === "failed") {
      throw new Error(
        `Cannot transition failed workflow instance "${instanceId}"`
      );
    }

    const handler = this.registry.lookup(instance.definitionId);
    if (!handler) {
      throw new Error(
        `Workflow handler "${instance.definitionId}" not found in registry`
      );
    }

    const machine = this.machines.get(instanceId)!;

    const resolved = machine.resolveTransition(trigger);
    if (!resolved.success) {
      throw new Error(
        `Invalid transition: trigger "${trigger}" not available from state "${instance.currentState}" for workflow "${instance.definitionId}"`
      );
    }

    const now = new Date();
    let executionResult: WorkflowExecutionResult = { success: true };
    let errorMessage: string | null = null;

    try {
      const executeResult = await handler.execute(
        Object.freeze({
          ...instance,
          currentState: resolved.toState,
          updatedAt: now,
        })
      );
      executionResult = executeResult;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);

      if (
        machine.isRetryableState(resolved.toState) &&
        instance.retryCount < instance.maxRetries
      ) {
        const updatedInstance: WorkflowInstance = Object.freeze({
          ...instance,
          updatedAt: now,
          retryCount: instance.retryCount + 1,
          error: errorMessage,
        });
        this.instances.set(instanceId, updatedInstance);
        return updatedInstance;
      }

      const failedInstance: WorkflowInstance = Object.freeze({
        ...instance,
        status: "failed" as WorkflowStatus,
        updatedAt: now,
        error: errorMessage,
      });
      this.instances.set(instanceId, failedInstance);

      this.events.emit(
        createWorkflowFailedEvent(
          instanceId,
          handler.id,
          resolved.toState,
          errorMessage
        )
      );

      return failedInstance;
    }

    if (!executionResult.success && executionResult.error) {
      errorMessage = executionResult.error;

      const failedInstance: WorkflowInstance = Object.freeze({
        ...instance,
        status: "failed" as WorkflowStatus,
        updatedAt: now,
        error: errorMessage,
      });
      this.instances.set(instanceId, failedInstance);

      this.events.emit(
        createWorkflowFailedEvent(
          instanceId,
          handler.id,
          resolved.toState,
          errorMessage
        )
      );

      return failedInstance;
    }

    machine.applyTransition(trigger);

    const transitionEvent: StateTransitionEvent = Object.freeze({
      from: resolved.fromState,
      to: resolved.toState,
      trigger: resolved.trigger,
      timestamp: now,
      success: true,
    });

    const updatedHistory = Object.freeze([...instance.history, transitionEvent]);

    let nextStatus: WorkflowStatus = "running";

    if (machine.isCompletedState(resolved.toState)) {
      nextStatus = "completed";
    }

    if (machine.isFailureState(resolved.toState)) {
      nextStatus = "failed";
      errorMessage = `Reached failure state "${resolved.toState}"`;
    }

    const mergedContext = executionResult.contextUpdates
      ? Object.freeze({ ...instance.context, ...executionResult.contextUpdates })
      : instance.context;

    const updatedInstance: WorkflowInstance = Object.freeze({
      id: instance.id,
      definitionId: instance.definitionId,
      currentState: resolved.toState,
      status: nextStatus,
      context: mergedContext,
      history: updatedHistory,
      startedAt: instance.startedAt,
      updatedAt: now,
      completedAt: nextStatus === "completed" ? now : null,
      retryCount: 0,
      maxRetries: instance.maxRetries,
      error: errorMessage,
    });

    this.instances.set(instanceId, updatedInstance);

    this.events.emit(
      createWorkflowStateChangedEvent(
        instanceId,
        handler.id,
        resolved.fromState,
        resolved.toState,
        resolved.trigger
      )
    );

    if (nextStatus === "completed") {
      this.events.emit(
        createWorkflowCompletedEvent(instanceId, handler.id, resolved.toState)
      );
    }

    if (nextStatus === "failed") {
      this.events.emit(
        createWorkflowFailedEvent(
          instanceId,
          handler.id,
          resolved.toState,
          errorMessage!
        )
      );
    }

    if (!errorMessage && executionResult.nextTrigger) {
      return this.transition(instanceId, executionResult.nextTrigger);
    }

    return updatedInstance;
  }

  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  listInstances(
    definitionId?: string
  ): readonly WorkflowInstance[] {
    const all = Array.from(this.instances.values());
    if (definitionId) {
      return all.filter(
        (i: WorkflowInstance) => i.definitionId === definitionId
      );
    }
    return all;
  }

  abort(instanceId: string): void {
    this.instances.delete(instanceId);
    this.machines.delete(instanceId);
  }

  clear(): void {
    this.instances.clear();
    this.machines.clear();
  }

  private generateId(): string {
    this.idCounter += 1;
    return `wf-${this.idCounter}-${Date.now()}`;
  }
}
