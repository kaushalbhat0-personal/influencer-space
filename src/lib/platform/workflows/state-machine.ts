import type {
  WorkflowDefinition,
  WorkflowState,
  WorkflowTransition,
  StateMachineResult,
} from "./types";

export class WorkflowStateMachine {
  private readonly definition: WorkflowDefinition;
  private readonly transitionMap: ReadonlyMap<string, ReadonlyMap<string, string>>;
  private readonly stateMap: ReadonlyMap<string, WorkflowState>;
  private current: string;

  constructor(definition: WorkflowDefinition) {
    validateDefinition(definition);
    this.definition = definition;
    this.transitionMap = buildTransitionMap(definition.transitions);
    this.stateMap = buildStateMap(definition.states);
    this.current = definition.initialState;
  }

  get currentState(): string {
    return this.current;
  }

  get availableTransitions(): readonly WorkflowTransition[] {
    return this.definition.transitions.filter(
      (t: WorkflowTransition) => t.from === this.current
    );
  }

  get availableTriggers(): readonly string[] {
    return this.availableTransitions.map((t: WorkflowTransition) => t.trigger);
  }

  get states(): readonly WorkflowState[] {
    return this.definition.states;
  }

  get definitionId(): string {
    return this.definition.id;
  }

  canTransition(trigger: string): boolean {
    const fromMap = this.transitionMap.get(this.current);
    if (!fromMap) return false;
    return fromMap.has(trigger);
  }

  resolveTransition(trigger: string): StateMachineResult {
    const fromState = this.current;

    if (!this.canTransition(trigger)) {
      const available = this.availableTriggers.join(", ");
      return {
        success: false,
        fromState,
        toState: fromState,
        trigger,
        error: `Invalid transition: trigger "${trigger}" not available from state "${fromState}". Available triggers: [${available}]`,
      };
    }

    const toState = this.transitionMap.get(this.current)!.get(trigger)!;

    return {
      success: true,
      fromState,
      toState,
      trigger,
    };
  }

  applyTransition(trigger: string): StateMachineResult {
    const result = this.resolveTransition(trigger);

    if (result.success) {
      this.current = result.toState;
    }

    return result;
  }

  canTransitionToState(stateId: string): boolean {
    return this.availableTransitions.some(
      (t: WorkflowTransition) => t.to === stateId
    );
  }

  getState(stateId: string): WorkflowState | undefined {
    return this.stateMap.get(stateId);
  }

  isRetryableState(stateId: string): boolean {
    const state = this.stateMap.get(stateId);
    return state?.metadata?.isRetryable === true;
  }

  isFailureState(stateId: string): boolean {
    const state = this.stateMap.get(stateId);
    return state?.metadata?.isFailure === true;
  }

  isCompletedState(stateId: string): boolean {
    const state = this.stateMap.get(stateId);
    return state?.metadata?.isCompleted === true;
  }

  reset(): void {
    this.current = this.definition.initialState;
  }

  getDefinition(): WorkflowDefinition {
    return this.definition;
  }
}

function buildTransitionMap(
  transitions: readonly WorkflowTransition[]
): ReadonlyMap<string, ReadonlyMap<string, string>> {
  const map = new Map<string, Map<string, string>>();

  transitions.forEach((t: WorkflowTransition) => {
    if (!map.has(t.from)) {
      map.set(t.from, new Map());
    }
    map.get(t.from)!.set(t.trigger, t.to);
  });

  const frozen = new Map<string, ReadonlyMap<string, string>>();
  map.forEach((triggers, from) => {
    frozen.set(from, triggers);
  });
  return frozen;
}

function buildStateMap(
  states: readonly WorkflowState[]
): ReadonlyMap<string, WorkflowState> {
  const map = new Map<string, WorkflowState>();
  states.forEach((s: WorkflowState) => {
    map.set(s.id, s);
  });
  return map;
}

function validateDefinition(def: WorkflowDefinition): void {
  const stateIds = new Set(def.states.map((s) => s.id));

  if (!stateIds.has(def.initialState)) {
    throw new Error(
      `Initial state "${def.initialState}" not found in workflow "${def.id}" states`
    );
  }

  const initialStates = def.states.filter(
    (s: WorkflowState) => s.metadata?.isInitial === true
  );
  if (initialStates.length > 1) {
    throw new Error(
      `Workflow "${def.id}" has ${initialStates.length} initial states (max 1)`
    );
  }

  def.transitions.forEach((t: { from: string; to: string }) => {
    if (!stateIds.has(t.from)) {
      throw new Error(
        `Transition from "${t.from}" references unknown state in workflow "${def.id}"`
      );
    }
    if (!stateIds.has(t.to)) {
      throw new Error(
        `Transition to "${t.to}" references unknown state in workflow "${def.id}"`
      );
    }
  });

  const transitionKeys = new Set<string>();
  def.transitions.forEach(
    (t: { from: string; to: string; trigger: string }) => {
      const key = `${t.from}:${t.trigger}`;
      if (transitionKeys.has(key)) {
        throw new Error(
          `Duplicate transition from "${t.from}" with trigger "${t.trigger}" in workflow "${def.id}"`
        );
      }
      transitionKeys.add(key);
    }
  );
}
