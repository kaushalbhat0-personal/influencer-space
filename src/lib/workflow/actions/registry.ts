import type { WorkflowAction } from "./interface";

export class ActionRegistry {
  private actions = new Map<string, WorkflowAction>();

  register(action: WorkflowAction): void {
    this.actions.set(action.id, action);
  }

  get(id: string): WorkflowAction | undefined {
    return this.actions.get(id);
  }

  getAll(): WorkflowAction[] {
    return Array.from(this.actions.values());
  }
}

export const actionRegistry = new ActionRegistry();
