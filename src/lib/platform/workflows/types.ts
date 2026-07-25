export type WorkflowStatus = "idle" | "running" | "completed" | "failed" | "paused";

export interface WorkflowStateMetadata {
  readonly isRetryable?: boolean;
  readonly isFailure?: boolean;
  readonly isCompleted?: boolean;
  readonly isInitial?: boolean;
}

export interface WorkflowState {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly metadata?: WorkflowStateMetadata;
}

export interface WorkflowTransition {
  readonly from: string;
  readonly to: string;
  readonly trigger: string;
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly states: readonly WorkflowState[];
  readonly transitions: readonly WorkflowTransition[];
  readonly initialState: string;
  readonly retryConfig?: {
    readonly maxRetries: number;
    readonly retryDelayMs: number;
  };
}

export interface WorkflowInstance {
  readonly id: string;
  readonly definitionId: string;
  readonly currentState: string;
  readonly status: WorkflowStatus;
  readonly context: Readonly<Record<string, unknown>>;
  readonly history: readonly StateTransitionEvent[];
  readonly startedAt: Date;
  readonly updatedAt: Date;
  readonly completedAt: Date | null;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly error: string | null;
}

export interface StateTransitionEvent {
  readonly from: string;
  readonly to: string;
  readonly trigger: string;
  readonly timestamp: Date;
  readonly success: boolean;
  readonly error?: string;
}

export interface WorkflowExecutionResult {
  readonly success: boolean;
  readonly error?: string;
  readonly nextTrigger?: string;
  readonly contextUpdates?: Readonly<Record<string, unknown>>;
}

export interface WorkflowHandler {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly definition: WorkflowDefinition;
  execute(instance: WorkflowInstance): WorkflowExecutionResult | Promise<WorkflowExecutionResult>;
}

export interface StateMachineResult {
  readonly success: boolean;
  readonly fromState: string;
  readonly toState: string;
  readonly trigger: string;
  readonly error?: string;
}

export interface WorkflowEvent {
  readonly type: string;
  readonly timestamp: Date;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface WorkflowStartedEvent extends WorkflowEvent {
  readonly type: "workflow:started";
  readonly payload: {
    readonly instanceId: string;
    readonly definitionId: string;
    readonly initialState: string;
  };
}

export interface WorkflowStateChangedEvent extends WorkflowEvent {
  readonly type: "workflow:state-changed";
  readonly payload: {
    readonly instanceId: string;
    readonly definitionId: string;
    readonly fromState: string;
    readonly toState: string;
    readonly trigger: string;
  };
}

export interface WorkflowCompletedEvent extends WorkflowEvent {
  readonly type: "workflow:completed";
  readonly payload: {
    readonly instanceId: string;
    readonly definitionId: string;
    readonly finalState: string;
  };
}

export interface WorkflowFailedEvent extends WorkflowEvent {
  readonly type: "workflow:failed";
  readonly payload: {
    readonly instanceId: string;
    readonly definitionId: string;
    readonly failedState: string;
    readonly error: string;
  };
}

export type WorkflowEventPayload =
  | WorkflowStartedEvent
  | WorkflowStateChangedEvent
  | WorkflowCompletedEvent
  | WorkflowFailedEvent;

export interface WorkflowEventMap {
  "workflow:started": WorkflowStartedEvent;
  "workflow:state-changed": WorkflowStateChangedEvent;
  "workflow:completed": WorkflowCompletedEvent;
  "workflow:failed": WorkflowFailedEvent;
}

export type EventListener<E extends WorkflowEvent = WorkflowEvent> = (event: E) => void;

export type WorkflowValidationIssue = {
  readonly field: string;
  readonly message: string;
};
