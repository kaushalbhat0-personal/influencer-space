import type {
  WorkflowEvent,
  EventListener,
  WorkflowStartedEvent,
  WorkflowStateChangedEvent,
  WorkflowCompletedEvent,
  WorkflowFailedEvent,
} from "./types";

export class WorkflowEventDispatcher {
  private listeners: Map<string, Set<EventListener>> = new Map();

  on<E extends WorkflowEvent>(type: E["type"], listener: EventListener<E>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener as EventListener);

    return () => {
      this.off(type, listener as EventListener);
    };
  }

  off<E extends WorkflowEvent>(type: E["type"], listener: EventListener<E>): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(listener as EventListener);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  emit<E extends WorkflowEvent>(event: E): void {
    const set = this.listeners.get(event.type);
    if (set) {
      Array.from(set).forEach((listener) => {
        listener(event);
      });
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }

  listenerCount(type: string): number {
    const set = this.listeners.get(type);
    return set ? set.size : 0;
  }

  hasListeners(type: string): boolean {
    return this.listenerCount(type) > 0;
  }
}

export function createWorkflowStartedEvent(
  instanceId: string,
  definitionId: string,
  initialState: string
): WorkflowStartedEvent {
  return Object.freeze({
    type: "workflow:started" as const,
    timestamp: new Date(),
    payload: Object.freeze({ instanceId, definitionId, initialState }),
  });
}

export function createWorkflowStateChangedEvent(
  instanceId: string,
  definitionId: string,
  fromState: string,
  toState: string,
  trigger: string
): WorkflowStateChangedEvent {
  return Object.freeze({
    type: "workflow:state-changed" as const,
    timestamp: new Date(),
    payload: Object.freeze({ instanceId, definitionId, fromState, toState, trigger }),
  });
}

export function createWorkflowCompletedEvent(
  instanceId: string,
  definitionId: string,
  finalState: string
): WorkflowCompletedEvent {
  return Object.freeze({
    type: "workflow:completed" as const,
    timestamp: new Date(),
    payload: Object.freeze({ instanceId, definitionId, finalState }),
  });
}

export function createWorkflowFailedEvent(
  instanceId: string,
  definitionId: string,
  failedState: string,
  error: string
): WorkflowFailedEvent {
  return Object.freeze({
    type: "workflow:failed" as const,
    timestamp: new Date(),
    payload: Object.freeze({ instanceId, definitionId, failedState, error }),
  });
}
