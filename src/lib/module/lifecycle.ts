import type {
  ModuleId,
  ModuleLifecycleState,
  ModuleValidationError,
  LifecycleTransition,
} from "./types";
import {
  MODULE_LIFECYCLE_TRANSITIONS,
  isValidLifecycleTransition,
} from "./types";

export class ModuleLifecycleManager {
  private states = new Map<ModuleId, ModuleLifecycleState>();
  private history: LifecycleTransition[] = [];

  setState(moduleId: ModuleId, state: ModuleLifecycleState): void {
    this.states.set(moduleId, state);
  }

  getState(moduleId: ModuleId): ModuleLifecycleState {
    return this.states.get(moduleId) ?? "draft";
  }

  transition(
    moduleId: ModuleId,
    from: ModuleLifecycleState,
    to: ModuleLifecycleState,
    metadata: Record<string, unknown> = {}
  ): LifecycleTransition {
    const currentState = this.getState(moduleId);
    if (currentState !== from) {
      return {
        from,
        to,
        moduleId,
        timestamp: new Date(),
        metadata,
        valid: false,
        errors: [
          {
            path: "lifecycle.state",
            message: `Expected current state "${from}" but module is "${currentState}"`,
            severity: "error",
          },
        ],
      };
    }

    if (!isValidLifecycleTransition(from, to)) {
      return {
        from,
        to,
        moduleId,
        timestamp: new Date(),
        metadata,
        valid: false,
        errors: [
          {
            path: "lifecycle.transition",
            message: `Invalid transition: "${from}" → "${to}"`,
            severity: "error",
          },
        ],
      };
    }

    this.states.set(moduleId, to);

    const transition: LifecycleTransition = {
      from,
      to,
      moduleId,
      timestamp: new Date(),
      metadata,
      valid: true,
      errors: [],
    };

    this.history.push(transition);
    return transition;
  }

  getAllowedTransitions(
    state: ModuleLifecycleState
  ): ModuleLifecycleState[] {
    return [...MODULE_LIFECYCLE_TRANSITIONS[state]];
  }

  getHistory(moduleId: ModuleId): LifecycleTransition[] {
    return this.history.filter((t) => t.moduleId === moduleId);
  }

  getAllHistory(): LifecycleTransition[] {
    return [...this.history];
  }

  canTransition(
    from: ModuleLifecycleState,
    to: ModuleLifecycleState
  ): boolean {
    return isValidLifecycleTransition(from, to);
  }

  isActive(moduleId: ModuleId): boolean {
    const state = this.getState(moduleId);
    return state === "enabled" || state === "live";
  }

  isPublished(moduleId: ModuleId): boolean {
    const state = this.getState(moduleId);
    return (
      state === "published" ||
      state === "installed" ||
      state === "configured" ||
      state === "previewed" ||
      state === "enabled" ||
      state === "live" ||
      state === "suspended"
    );
  }

  isArchived(moduleId: ModuleId): boolean {
    return this.getState(moduleId) === "archived";
  }

  validateTransition(
    from: ModuleLifecycleState,
    to: ModuleLifecycleState
  ): ModuleValidationError[] {
    const errors: ModuleValidationError[] = [];

    if (!isValidLifecycleTransition(from, to)) {
      errors.push({
        path: "lifecycle.transition",
        message: `Cannot transition from "${from}" to "${to}". Allowed: ${MODULE_LIFECYCLE_TRANSITIONS[from].join(", ")}`,
        severity: "error",
      });
    }

    if (from === to) {
      errors.push({
        path: "lifecycle.transition",
        message: "Source and target states are identical",
        severity: "warning",
      });
    }

    if (to === "archived" && from !== "archived") {
      errors.push({
        path: "lifecycle.transition",
        message:
          "Archiving a module is irreversible. Ensure data is backed up.",
        severity: "warning",
      });
    }

    return errors;
  }
}

export const moduleLifecycleManager = new ModuleLifecycleManager();
