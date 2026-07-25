import { describe, it, expect, vi } from "vitest";
import { WorkflowStateMachine } from "@/lib/platform/workflows/state-machine";
import { WorkflowRegistry } from "@/lib/platform/workflows/registry";
import { WorkflowEngine } from "@/lib/platform/workflows/engine";
import {
  WorkflowEventDispatcher,
  createWorkflowStartedEvent,
  createWorkflowStateChangedEvent,
  createWorkflowCompletedEvent,
  createWorkflowFailedEvent,
} from "@/lib/platform/workflows/events";
import {
  creatorOnboardingWorkflow,
  manualRegenerationWorkflow,
  builderPublishWorkflow,
  superAdminProvisionWorkflow,
  agencyClientOnboardingWorkflow,
  ALL_WORKFLOWS,
} from "@/lib/platform/workflows/workflows";
import type {
  WorkflowDefinition,
  WorkflowHandler,
  WorkflowInstance,
  WorkflowExecutionResult,
} from "@/lib/platform/workflows/types";

function createTestDefinition(): WorkflowDefinition {
  return {
    id: "test-workflow",
    name: "Test Workflow",
    description: "A test workflow",
    states: [
      { id: "start", name: "Start", metadata: { isInitial: true } },
      { id: "processing", name: "Processing", metadata: { isRetryable: true } },
      { id: "completed", name: "Completed", metadata: { isCompleted: true } },
      { id: "failed", name: "Failed", metadata: { isFailure: true } },
    ],
    transitions: [
      { from: "start", to: "processing", trigger: "next" },
      { from: "start", to: "failed", trigger: "fail" },
      { from: "processing", to: "completed", trigger: "complete" },
      { from: "processing", to: "failed", trigger: "fail" },
    ],
    initialState: "start",
    retryConfig: { maxRetries: 3, retryDelayMs: 100 },
  };
}

function createMockHandler(
  id: string = "test-workflow",
  executeFn?: (
    instance: WorkflowInstance
  ) => WorkflowExecutionResult | Promise<WorkflowExecutionResult>
): WorkflowHandler {
  return {
    id,
    name: "Test Workflow",
    description: "A test workflow handler",
    definition: createTestDefinition(),
    execute:
      executeFn ??
      (() => {
        return { success: true };
      }),
  };
}

function createMultiStateDefinition(): WorkflowDefinition {
  return {
    id: "multi-state",
    name: "Multi State",
    description: "Multi-state workflow for testing",
    states: [
      { id: "s1", name: "State 1", metadata: { isInitial: true } },
      { id: "s2", name: "State 2" },
      { id: "s3", name: "State 3" },
      { id: "s4", name: "State 4" },
      { id: "done", name: "Done", metadata: { isCompleted: true } },
      { id: "err", name: "Error", metadata: { isFailure: true } },
    ],
    transitions: [
      { from: "s1", to: "s2", trigger: "next" },
      { from: "s2", to: "s3", trigger: "next" },
      { from: "s3", to: "s4", trigger: "next" },
      { from: "s4", to: "done", trigger: "finish" },
      { from: "s1", to: "err", trigger: "fail" },
      { from: "s2", to: "err", trigger: "fail" },
      { from: "s3", to: "err", trigger: "fail" },
      { from: "s4", to: "err", trigger: "fail" },
    ],
    initialState: "s1",
  };
}

// ─── WorkflowStateMachine ──────────────────────────────────────

describe("WorkflowStateMachine", () => {
  it("creates with initial state from definition", () => {
    const def = createTestDefinition();
    const machine = new WorkflowStateMachine(def);
    expect(machine.currentState).toBe("start");
  });

  it("canTransition returns true for valid trigger from current state", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    expect(machine.canTransition("next")).toBe(true);
    expect(machine.canTransition("fail")).toBe(true);
  });

  it("canTransition returns false for invalid trigger", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    expect(machine.canTransition("complete")).toBe(false);
    expect(machine.canTransition("unknown")).toBe(false);
  });

  it("resolveTransition returns success with target state", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    const result = machine.resolveTransition("next");
    expect(result.success).toBe(true);
    expect(result.fromState).toBe("start");
    expect(result.toState).toBe("processing");
    expect(result.trigger).toBe("next");
  });

  it("resolveTransition returns failure for invalid trigger", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    const result = machine.resolveTransition("unknown");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("resolveTransition does not mutate current state", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    machine.resolveTransition("next");
    expect(machine.currentState).toBe("start");
  });

  it("applyTransition advances current state", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    const result = machine.applyTransition("next");
    expect(result.success).toBe(true);
    expect(machine.currentState).toBe("processing");
  });

  it("availableTriggers returns triggers for current state", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    expect(machine.availableTriggers).toEqual(["next", "fail"]);
    machine.applyTransition("next");
    expect(machine.availableTriggers).toEqual(["complete", "fail"]);
  });

  it("canTransitionToState checks if state is reachable", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    expect(machine.canTransitionToState("processing")).toBe(true);
    expect(machine.canTransitionToState("completed")).toBe(false);
  });

  it("isRetryableState identifies retryable states", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    expect(machine.isRetryableState("processing")).toBe(true);
    expect(machine.isRetryableState("start")).toBe(false);
  });

  it("isFailureState identifies failure states", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    expect(machine.isFailureState("failed")).toBe(true);
    expect(machine.isFailureState("start")).toBe(false);
  });

  it("isCompletedState identifies completed states", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    expect(machine.isCompletedState("completed")).toBe(true);
    expect(machine.isCompletedState("start")).toBe(false);
  });

  it("reset returns to initial state", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    machine.applyTransition("next");
    machine.applyTransition("complete");
    expect(machine.currentState).toBe("completed");
    machine.reset();
    expect(machine.currentState).toBe("start");
  });

  it("throws when initialState is not in states", () => {
    const def = createTestDefinition();
    def.initialState = "nonexistent";
    expect(() => new WorkflowStateMachine(def)).toThrow(
      'Initial state "nonexistent" not found'
    );
  });

  it("throws on duplicate transitions from same state with same trigger", () => {
    const def = createTestDefinition();
    def.transitions = [
      ...def.transitions,
      { from: "start", to: "failed", trigger: "next" },
    ];
    expect(() => new WorkflowStateMachine(def)).toThrow(/Duplicate transition/);
  });

  it("throws when transition references unknown state", () => {
    const def = createTestDefinition();
    def.transitions = [
      { from: "start", to: "phantom", trigger: "next" },
    ];
    expect(() => new WorkflowStateMachine(def)).toThrow(
      'Transition to "phantom" references unknown state'
    );
  });

  it("throws when there are multiple isInitial states", () => {
    const def = createTestDefinition();
    def.states = [
      ...def.states,
      { id: "alt-start", name: "Alt Start", metadata: { isInitial: true } },
    ];
    expect(() => new WorkflowStateMachine(def)).toThrow(/2 initial states/i);
  });

  it("chains multiple transitions deterministically", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    machine.applyTransition("next");
    machine.applyTransition("complete");
    expect(machine.currentState).toBe("completed");
  });

  it("is deterministic: same definition, same sequence, same result", () => {
    for (let i = 0; i < 10; i++) {
      const machine = new WorkflowStateMachine(createTestDefinition());
      machine.applyTransition("next");
      machine.applyTransition("complete");
      expect(machine.currentState).toBe("completed");
    }
  });

  it("getState returns state by id", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    const state = machine.getState("processing");
    expect(state).toBeDefined();
    expect(state!.id).toBe("processing");
    expect(state!.metadata?.isRetryable).toBe(true);
  });

  it("getState returns undefined for unknown id", () => {
    const machine = new WorkflowStateMachine(createTestDefinition());
    expect(machine.getState("unknown")).toBeUndefined();
  });
});

// ─── WorkflowEventDispatcher ───────────────────────────────────

describe("WorkflowEventDispatcher", () => {
  it("emits event to subscribed listener", () => {
    const dispatcher = new WorkflowEventDispatcher();
    const handler = vi.fn();
    dispatcher.on("workflow:started", handler);
    const event = createWorkflowStartedEvent("i1", "wf1", "start");
    dispatcher.emit(event);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("does not call listener after unsubscribe", () => {
    const dispatcher = new WorkflowEventDispatcher();
    const handler = vi.fn();
    dispatcher.on("workflow:started", handler);
    dispatcher.off("workflow:started", handler);
    dispatcher.emit(createWorkflowStartedEvent("i1", "wf1", "start"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("supports multiple listeners for same event", () => {
    const dispatcher = new WorkflowEventDispatcher();
    const h1 = vi.fn();
    const h2 = vi.fn();
    dispatcher.on("workflow:started", h1);
    dispatcher.on("workflow:started", h2);
    dispatcher.emit(createWorkflowStartedEvent("i1", "wf1", "start"));
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("does not throw when emitting with no listeners", () => {
    const dispatcher = new WorkflowEventDispatcher();
    expect(() => {
      dispatcher.emit(createWorkflowStartedEvent("i1", "wf1", "start"));
    }).not.toThrow();
  });

  it("removeAllListeners clears all listeners", () => {
    const dispatcher = new WorkflowEventDispatcher();
    dispatcher.on("workflow:started", vi.fn());
    dispatcher.on("workflow:completed", vi.fn());
    dispatcher.removeAllListeners();
    expect(dispatcher.listenerCount("workflow:started")).toBe(0);
    expect(dispatcher.listenerCount("workflow:completed")).toBe(0);
  });

  it("listenerCount returns correct count", () => {
    const dispatcher = new WorkflowEventDispatcher();
    expect(dispatcher.listenerCount("workflow:started")).toBe(0);
    dispatcher.on("workflow:started", vi.fn());
    expect(dispatcher.listenerCount("workflow:started")).toBe(1);
    dispatcher.on("workflow:started", vi.fn());
    expect(dispatcher.listenerCount("workflow:started")).toBe(2);
  });

  it("hasListeners returns correct boolean", () => {
    const dispatcher = new WorkflowEventDispatcher();
    expect(dispatcher.hasListeners("workflow:started")).toBe(false);
    dispatcher.on("workflow:started", vi.fn());
    expect(dispatcher.hasListeners("workflow:started")).toBe(true);
  });

  it("unsubscribe via returned function", () => {
    const dispatcher = new WorkflowEventDispatcher();
    const handler = vi.fn();
    const unsubscribe = dispatcher.on("workflow:started", handler);
    unsubscribe();
    dispatcher.emit(createWorkflowStartedEvent("i1", "wf1", "start"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("createWorkflowStartedEvent creates correct event", () => {
    const event = createWorkflowStartedEvent("i1", "wf1", "start");
    expect(event.type).toBe("workflow:started");
    expect(event.payload.instanceId).toBe("i1");
    expect(event.payload.definitionId).toBe("wf1");
    expect(event.payload.initialState).toBe("start");
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it("createWorkflowStateChangedEvent creates correct event", () => {
    const event = createWorkflowStateChangedEvent(
      "i1",
      "wf1",
      "start",
      "processing",
      "next"
    );
    expect(event.type).toBe("workflow:state-changed");
    expect(event.payload.fromState).toBe("start");
    expect(event.payload.toState).toBe("processing");
    expect(event.payload.trigger).toBe("next");
  });

  it("createWorkflowCompletedEvent creates correct event", () => {
    const event = createWorkflowCompletedEvent("i1", "wf1", "done");
    expect(event.type).toBe("workflow:completed");
    expect(event.payload.finalState).toBe("done");
  });

  it("createWorkflowFailedEvent creates correct event", () => {
    const event = createWorkflowFailedEvent("i1", "wf1", "processing", "timeout");
    expect(event.type).toBe("workflow:failed");
    expect(event.payload.failedState).toBe("processing");
    expect(event.payload.error).toBe("timeout");
  });

  it("events are deeply frozen", () => {
    const event = createWorkflowStartedEvent("i1", "wf1", "start");
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.payload)).toBe(true);
  });
});

// ─── WorkflowRegistry ──────────────────────────────────────────

describe("WorkflowRegistry", () => {
  it("registers a workflow handler", () => {
    const registry = new WorkflowRegistry();
    const handler = createMockHandler();
    registry.register(handler);
    expect(registry.has("test-workflow")).toBe(true);
    expect(registry.count()).toBe(1);
  });

  it("throws on duplicate registration", () => {
    const registry = new WorkflowRegistry();
    registry.register(createMockHandler());
    expect(() => registry.register(createMockHandler())).toThrow(
      /already registered/
    );
  });

  it("lookup returns registered handler", () => {
    const registry = new WorkflowRegistry();
    const handler = createMockHandler();
    registry.register(handler);
    expect(registry.lookup("test-workflow")).toBe(handler);
  });

  it("lookup returns undefined for unknown id", () => {
    const registry = new WorkflowRegistry();
    expect(registry.lookup("unknown")).toBeUndefined();
  });

  it("remove returns true and removes handler", () => {
    const registry = new WorkflowRegistry();
    registry.register(createMockHandler());
    expect(registry.remove("test-workflow")).toBe(true);
    expect(registry.has("test-workflow")).toBe(false);
  });

  it("remove returns false for unknown id", () => {
    const registry = new WorkflowRegistry();
    expect(registry.remove("unknown")).toBe(false);
  });

  it("list returns all registered IDs", () => {
    const registry = new WorkflowRegistry();
    registry.register(createMockHandler("wf1"));
    registry.register(createMockHandler("wf2"));
    const ids = registry.list();
    expect(ids).toContain("wf1");
    expect(ids).toContain("wf2");
    expect(ids.length).toBe(2);
  });

  it("getDefinition returns workflow definition", () => {
    const registry = new WorkflowRegistry();
    const handler = createMockHandler();
    registry.register(handler);
    const def = registry.getDefinition("test-workflow");
    expect(def).toBe(handler.definition);
  });

  it("getDefinition returns undefined for unknown id", () => {
    const registry = new WorkflowRegistry();
    expect(registry.getDefinition("unknown")).toBeUndefined();
  });

  it("registerMultiple registers all handlers", () => {
    const registry = new WorkflowRegistry();
    registry.registerMultiple([
      createMockHandler("wf1"),
      createMockHandler("wf2"),
    ]);
    expect(registry.count()).toBe(2);
  });

  it("clear removes all handlers", () => {
    const registry = new WorkflowRegistry();
    registry.register(createMockHandler("wf1"));
    registry.register(createMockHandler("wf2"));
    registry.clear();
    expect(registry.count()).toBe(0);
  });

  it("listHandlers returns all handler references", () => {
    const registry = new WorkflowRegistry();
    const h1 = createMockHandler("wf1");
    const h2 = createMockHandler("wf2");
    registry.registerMultiple([h1, h2]);
    const handlers = registry.listHandlers();
    expect(handlers).toContain(h1);
    expect(handlers).toContain(h2);
    expect(handlers.length).toBe(2);
  });

  it("validateAll returns issues for invalid definitions", () => {
    const registry = new WorkflowRegistry();
    const def = createTestDefinition();
    def.transitions = [
      { from: "start", to: "phantom", trigger: "next" },
    ];
    registry.register({
      id: "bad",
      name: "Bad",
      description: "",
      definition: def,
      execute: () => ({ success: true }),
    });
    const issues = registry.validateAll();
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].field).toContain("transitions");
  });

  it("validateAll returns empty for valid definitions", () => {
    const registry = new WorkflowRegistry();
    registry.register(createMockHandler("valid1"));
    registry.register(createMockHandler("valid2"));
    const issues = registry.validateAll();
    expect(issues.length).toBe(0);
  });
});

// ─── WorkflowEngine ────────────────────────────────────────────

describe("WorkflowEngine", () => {
  function createEngine(
    handler: WorkflowHandler = createMockHandler()
  ): {
    registry: WorkflowRegistry;
    events: WorkflowEventDispatcher;
    engine: WorkflowEngine;
  } {
    const registry = new WorkflowRegistry();
    const events = new WorkflowEventDispatcher();
    const engine = new WorkflowEngine(registry, events);
    registry.register(handler);
    return { registry, events, engine };
  }

  it("start creates a running instance", () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    expect(instance.id).toBeDefined();
    expect(instance.definitionId).toBe("test-workflow");
    expect(instance.status).toBe("running");
    expect(instance.currentState).toBe("start");
  });

  it("start throws for unknown workflow", () => {
    const registry = new WorkflowRegistry();
    const events = new WorkflowEventDispatcher();
    const engine = new WorkflowEngine(registry, events);
    expect(() => engine.start("unknown")).toThrow(/not found/);
  });

  it("start accepts optional context", () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow", {
      userId: "u1",
      email: "test@test.com",
    });
    expect(instance.context).toEqual({ userId: "u1", email: "test@test.com" });
  });

  it("start emits workflow:started event", () => {
    const { engine, events } = createEngine();
    const handler = vi.fn();
    events.on("workflow:started", handler);
    const instance = engine.start("test-workflow");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "workflow:started",
        payload: expect.objectContaining({
          instanceId: instance.id,
          definitionId: "test-workflow",
        }),
      })
    );
  });

  it("transition advances to next state", async () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    const updated = await engine.transition(instance.id, "next");
    expect(updated.currentState).toBe("processing");
    expect(updated.status).toBe("running");
  });

  it("transition throws for invalid trigger", async () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    await expect(
      engine.transition(instance.id, "complete")
    ).rejects.toThrow(/Invalid transition/);
  });

  it("transition throws for unknown instance", async () => {
    const { engine } = createEngine();
    await expect(
      engine.transition("nonexistent", "next")
    ).rejects.toThrow(/not found/);
  });

  it("transition throws for completed instance", async () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    await engine.transition(instance.id, "next");
    await engine.transition(instance.id, "complete");
    await expect(
      engine.transition(instance.id, "next")
    ).rejects.toThrow(/completed/);
  });

  it("transition throws for failed instance", async () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    await engine.transition(instance.id, "fail");
    await expect(
      engine.transition(instance.id, "next")
    ).rejects.toThrow(/failed/);
  });

  it("completes workflow on reaching completed state", async () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    await engine.transition(instance.id, "next");
    const completed = await engine.transition(instance.id, "complete");
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeInstanceOf(Date);
  });

  it("fails workflow on reaching failure state", async () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    const failed = await engine.transition(instance.id, "fail");
    expect(failed.status).toBe("failed");
    expect(failed.error).toContain("failure state");
  });

  it("emits workflow:state-changed on transition", async () => {
    const { engine, events } = createEngine();
    const handler = vi.fn();
    events.on("workflow:state-changed", handler);
    const instance = engine.start("test-workflow");
    await engine.transition(instance.id, "next");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          fromState: "start",
          toState: "processing",
          trigger: "next",
        }),
      })
    );
  });

  it("emits workflow:completed on reaching completed state", async () => {
    const { engine, events } = createEngine();
    const handler = vi.fn();
    events.on("workflow:completed", handler);
    const instance = engine.start("test-workflow");
    await engine.transition(instance.id, "next");
    await engine.transition(instance.id, "complete");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("emits workflow:failed on reaching failure state", async () => {
    const { engine, events } = createEngine();
    const handler = vi.fn();
    events.on("workflow:failed", handler);
    const instance = engine.start("test-workflow");
    await engine.transition(instance.id, "fail");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("calls handler.execute with current instance state", async () => {
    const executeFn = vi
      .fn()
      .mockReturnValue({ success: true });
    const handler = createMockHandler("test-workflow", executeFn);
    const { engine } = createEngine(handler);
    const instance = engine.start("test-workflow");
    await engine.transition(instance.id, "next");
    expect(executeFn).toHaveBeenCalledTimes(1);
    expect(executeFn).toHaveBeenCalledWith(
      expect.objectContaining({
        id: instance.id,
        currentState: "processing",
      })
    );
  });

  it("context updates from execute result are merged", async () => {
    const executeFn = vi.fn().mockReturnValue({
      success: true,
      contextUpdates: { generatedId: "abc", status: "done" },
    });
    const handler = createMockHandler("test-workflow", executeFn);
    const { engine } = createEngine(handler);
    const instance = engine.start("test-workflow", { initialKey: "val" });
    const updated = await engine.transition(instance.id, "next");
    expect(updated.context).toEqual({
      initialKey: "val",
      generatedId: "abc",
      status: "done",
    });
  });

  it("auto-advances via nextTrigger from execute result", async () => {
    let callCount = 0;
    const executeFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return { success: true, nextTrigger: "complete" };
      }
      return { success: true };
    });
    const def = createTestDefinition();
    const handler: WorkflowHandler = {
      id: "test-workflow",
      name: "Test",
      description: "",
      definition: def,
      execute: executeFn,
    };
    const { engine } = createEngine(handler);
    const instance = engine.start("test-workflow");
    await engine.transition(instance.id, "next");
    expect(executeFn).toHaveBeenCalledTimes(2);
  });

  it("retries handler execution when state is retryable", async () => {
    let callCount = 0;
    const executeFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        throw new Error("temporary error");
      }
      return { success: true };
    });
    const handler = createMockHandler("test-workflow", executeFn);
    const { engine } = createEngine(handler);
    const instance = engine.start("test-workflow");
    const retried = await engine.transition(instance.id, "next");
    expect(retried.status).toBe("running");
    expect(retried.retryCount).toBe(1);
    expect(retried.error).toBe("temporary error");
    // Machine should NOT have advanced since execute failed
    expect(retried.currentState).toBe("start");
  });

  it("fails workflow after exceeding max retries", async () => {
    const executeFn = vi.fn().mockImplementation(() => {
      throw new Error("persistent error");
    });
    const handler = createMockHandler("test-workflow", executeFn);
    const { engine } = createEngine(handler);
    const instance = engine.start("test-workflow");
    await engine.transition(instance.id, "next");
    await engine.transition(instance.id, "next");
    await engine.transition(instance.id, "next");
    const failed = await engine.transition(instance.id, "next");
    expect(failed.status).toBe("failed");
    expect(failed.retryCount).toBe(3);
  });

  it("retry works again after first retry with same trigger", async () => {
    let callCount = 0;
    const executeFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        throw new Error("first attempt failed");
      }
      return { success: true };
    });
    const handler = createMockHandler("test-workflow", executeFn);
    const { engine } = createEngine(handler);
    const instance = engine.start("test-workflow");
    // First attempt: fails
    const retried = await engine.transition(instance.id, "next");
    expect(retried.retryCount).toBe(1);
    expect(retried.currentState).toBe("start");
    // Second attempt: succeeds
    const advanced = await engine.transition(instance.id, "next");
    expect(advanced.currentState).toBe("processing");
    expect(advanced.retryCount).toBe(0); // retry count resets on successful transition
  });

  it("getInstance returns instance by id", () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    const found = engine.getInstance(instance.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(instance.id);
  });

  it("getInstance returns undefined for unknown id", () => {
    const { engine } = createEngine();
    expect(engine.getInstance("unknown")).toBeUndefined();
  });

  it("listInstances returns all instances", () => {
    const { engine } = createEngine();
    engine.start("test-workflow");
    engine.start("test-workflow");
    expect(engine.listInstances().length).toBe(2);
  });

  it("listInstances filters by definitionId", () => {
    const { engine, registry } = createEngine();
    registry.register(
      createMockHandler("other-workflow")
    );
    engine.start("test-workflow");
    engine.start("test-workflow");
    engine.start("other-workflow");
    expect(engine.listInstances("test-workflow").length).toBe(2);
    expect(engine.listInstances("other-workflow").length).toBe(1);
  });

  it("abort removes instance", () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    expect(engine.getInstance(instance.id)).toBeDefined();
    engine.abort(instance.id);
    expect(engine.getInstance(instance.id)).toBeUndefined();
  });

  it("clear removes all instances", () => {
    const { engine } = createEngine();
    engine.start("test-workflow");
    engine.start("test-workflow");
    engine.clear();
    expect(engine.listInstances().length).toBe(0);
  });

  it("records transition history", async () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    const s2 = await engine.transition(instance.id, "next");
    expect(s2.history.length).toBe(1);
    expect(s2.history[0].from).toBe("start");
    expect(s2.history[0].to).toBe("processing");
    expect(s2.history[0].trigger).toBe("next");
    const s3 = await engine.transition(instance.id, "complete");
    expect(s3.history.length).toBe(2);
    expect(s3.history[1].to).toBe("completed");
  });

  it("handler can soft-fail via result.error", async () => {
    const executeFn = vi.fn().mockReturnValue({
      success: false,
      error: "validation failed",
    });
    const handler = createMockHandler("test-workflow", executeFn);
    const { engine } = createEngine(handler);
    const instance = engine.start("test-workflow");
    const result = await engine.transition(instance.id, "next");
    expect(result.status).toBe("failed");
    expect(result.error).toBe("validation failed");
  });

  it("instance context is read-only", () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    expect(Object.isFrozen(instance.context)).toBe(true);
  });

  it("instance is deeply frozen", () => {
    const { engine } = createEngine();
    const instance = engine.start("test-workflow");
    expect(Object.isFrozen(instance)).toBe(true);
  });
});

// ─── Workflow Definitions ──────────────────────────────────────

describe("Workflow Definitions", () => {
  it("creatorOnboardingWorkflow has correct definition", () => {
    const def = creatorOnboardingWorkflow.definition;
    expect(def.id).toBe("creator-onboarding");
    expect(def.initialState).toBe("signup");
    expect(def.states.length).toBeGreaterThanOrEqual(7);
    expect(def.transitions.length).toBeGreaterThanOrEqual(8);
  });

  it("manualRegenerationWorkflow has correct definition", () => {
    const def = manualRegenerationWorkflow.definition;
    expect(def.id).toBe("manual-regeneration");
    expect(def.initialState).toBe("request");
  });

  it("builderPublishWorkflow has correct definition", () => {
    const def = builderPublishWorkflow.definition;
    expect(def.id).toBe("builder-publish");
    expect(def.initialState).toBe("draft");
  });

  it("superAdminProvisionWorkflow has correct definition", () => {
    const def = superAdminProvisionWorkflow.definition;
    expect(def.id).toBe("super-admin-provision");
    expect(def.initialState).toBe("create-tenant");
  });

  it("agencyClientOnboardingWorkflow has correct definition", () => {
    const def = agencyClientOnboardingWorkflow.definition;
    expect(def.id).toBe("agency-client-onboarding");
    expect(def.initialState).toBe("create-client");
  });

  it("all workflows have unique IDs", () => {
    const ids = ALL_WORKFLOWS.map((w) => w.definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all workflows have valid state machines", () => {
    ALL_WORKFLOWS.forEach((wf) => {
      expect(() => new WorkflowStateMachine(wf.definition)).not.toThrow();
    });
  });

  it("each workflow has at least one completed state", () => {
    ALL_WORKFLOWS.forEach((wf) => {
      const hasCompleted = wf.definition.states.some(
        (s) => s.metadata?.isCompleted
      );
      expect(hasCompleted).toBe(true);
    });
  });

  it("each workflow has at least one failure state", () => {
    ALL_WORKFLOWS.forEach((wf) => {
      const hasFailure = wf.definition.states.some(
        (s) => s.metadata?.isFailure
      );
      expect(hasFailure).toBe(true);
    });
  });

  it("ALL_WORKFLOWS contains all 5 workflows", () => {
    expect(ALL_WORKFLOWS.length).toBe(5);
  });
});

// ─── Integration ───────────────────────────────────────────────

describe("Integration — Full Workflow Lifecycle", () => {
  it("creates, transitions, and completes a multi-state workflow", async () => {
    const def = createMultiStateDefinition();
    const handler: WorkflowHandler = {
      id: "multi-state",
      name: "Multi State",
      description: "",
      definition: def,
      execute: () => ({ success: true }),
    };
    const registry = new WorkflowRegistry();
    const events = new WorkflowEventDispatcher();
    const engine = new WorkflowEngine(registry, events);
    registry.register(handler);

    const eventsReceived: string[] = [];
    events.on("workflow:state-changed", () => {
      eventsReceived.push("changed");
    });
    events.on("workflow:completed", () => {
      eventsReceived.push("completed");
    });

    const instance = engine.start("multi-state");
    expect(instance.currentState).toBe("s1");

    const s2 = await engine.transition(instance.id, "next");
    expect(s2.currentState).toBe("s2");

    const s3 = await engine.transition(instance.id, "next");
    expect(s3.currentState).toBe("s3");

    const s4 = await engine.transition(instance.id, "next");
    expect(s4.currentState).toBe("s4");

    const done = await engine.transition(instance.id, "finish");
    expect(done.currentState).toBe("done");
    expect(done.status).toBe("completed");

    expect(eventsReceived).toEqual(["changed", "changed", "changed", "changed", "completed"]);
  });

  it("workflow can fail from any state", async () => {
    const def = createMultiStateDefinition();
    const handler: WorkflowHandler = {
      id: "multi-state",
      name: "Multi State",
      description: "",
      definition: def,
      execute: () => ({ success: true }),
    };
    const registry = new WorkflowRegistry();
    const events = new WorkflowEventDispatcher();
    const engine = new WorkflowEngine(registry, events);
    registry.register(handler);

    const instance = engine.start("multi-state");
    await engine.transition(instance.id, "next");
    await engine.transition(instance.id, "next");
    const failed = await engine.transition(instance.id, "fail");
    expect(failed.status).toBe("failed");
  });

  it("custom workflow can be registered and executed", async () => {
    const customDef: WorkflowDefinition = {
      id: "custom-workflow",
      name: "Custom",
      description: "A custom workflow",
      states: [
        { id: "init", name: "Init", metadata: { isInitial: true } },
        { id: "done", name: "Done", metadata: { isCompleted: true } },
        { id: "err", name: "Error", metadata: { isFailure: true } },
      ],
      transitions: [
        { from: "init", to: "done", trigger: "finish" },
        { from: "init", to: "err", trigger: "fail" },
      ],
      initialState: "init",
    };
    const customHandler: WorkflowHandler = {
      id: "custom-workflow",
      name: "Custom",
      description: "",
      definition: customDef,
      execute: () => ({ success: true, contextUpdates: { custom: true } }),
    };
    const registry = new WorkflowRegistry();
    const events = new WorkflowEventDispatcher();
    const engine = new WorkflowEngine(registry, events);
    registry.register(customHandler);

    const instance = engine.start("custom-workflow", { input: "test" });
    expect(instance.currentState).toBe("init");

    const done = await engine.transition(instance.id, "finish");
    expect(done.status).toBe("completed");
    expect(done.context).toEqual({ input: "test", custom: true });
  });

  it("deterministic execution: same sequence always produces same result", async () => {
    const def = createMultiStateDefinition();
    const handler: WorkflowHandler = {
      id: "multi-state",
      name: "Multi State",
      description: "",
      definition: def,
      execute: () => ({ success: true }),
    };
    const registry = new WorkflowRegistry();
    const events = new WorkflowEventDispatcher();
    const engine = new WorkflowEngine(registry, events);
    registry.register(handler);

    const results: string[] = [];
    for (let i = 0; i < 5; i++) {
      const instance = engine.start("multi-state");
      const s2 = await engine.transition(instance.id, "next");
      const s3 = await engine.transition(s2.id, "next");
      const s4 = await engine.transition(s3.id, "next");
      const done = await engine.transition(s4.id, "finish");
      results.push(`${done.currentState}:${done.status}`);
    }
    results.forEach((r) => expect(r).toBe("done:completed"));
  });
});

// ─── Open/Closed Principle ─────────────────────────────────────

describe("Open/Closed — Extensibility", () => {
  it("new workflows can be registered without modifying existing code", () => {
    const registry = new WorkflowRegistry();
    registry.registerMultiple([
      createMockHandler("wf1"),
      createMockHandler("wf2"),
    ]);
    expect(registry.count()).toBe(2);

    const customDef: WorkflowDefinition = {
      id: "custom-ext",
      name: "Custom Extension",
      description: "Added without touching existing code",
      states: [
        { id: "a", name: "A", metadata: { isInitial: true } },
        { id: "b", name: "B", metadata: { isCompleted: true } },
      ],
      transitions: [{ from: "a", to: "b", trigger: "go" }],
      initialState: "a",
    };
    registry.register({
      id: "custom-ext",
      name: "Custom Extension",
      description: "",
      definition: customDef,
      execute: () => ({ success: true }),
    });
    expect(registry.count()).toBe(3);
  });

  it("registry can be extended with event listeners", () => {
    const registry = new WorkflowRegistry();
    const events = new WorkflowEventDispatcher();
    const engine = new WorkflowEngine(registry, events);
    registry.register(createMockHandler("ext-workflow"));

    const auditLog: string[] = [];
    events.on("workflow:started", (e) => {
      auditLog.push(`started:${e.payload.instanceId}`);
    });
    events.on("workflow:completed", (e) => {
      auditLog.push(`completed:${e.payload.instanceId}`);
    });

    const instance = engine.start("ext-workflow");
    expect(auditLog).toContain(`started:${instance.id}`);
  });
});
