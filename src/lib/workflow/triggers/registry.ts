import type { WorkflowTrigger } from "./interface";

export class TriggerRegistry {
  private triggers = new Map<string, WorkflowTrigger>();

  register(trigger: WorkflowTrigger): void {
    this.triggers.set(trigger.id, trigger);
  }

  get(id: string): WorkflowTrigger | undefined {
    return this.triggers.get(id);
  }

  getAll(): WorkflowTrigger[] {
    return Array.from(this.triggers.values());
  }
}

export const triggerRegistry = new TriggerRegistry();
