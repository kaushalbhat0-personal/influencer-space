import type { WorkflowHandler, WorkflowDefinition, WorkflowValidationIssue } from "./types";

export class WorkflowRegistry {
  private readonly handlers: Map<string, WorkflowHandler> = new Map();

  register(handler: WorkflowHandler): void {
    if (this.handlers.has(handler.id)) {
      throw new Error(
        `Workflow "${handler.id}" is already registered`
      );
    }
    this.handlers.set(handler.id, handler);
  }

  registerMultiple(handlers: readonly WorkflowHandler[]): void {
    for (const h of handlers) {
      this.register(h);
    }
  }

  remove(id: string): boolean {
    return this.handlers.delete(id);
  }

  lookup(id: string): WorkflowHandler | undefined {
    return this.handlers.get(id);
  }

  getDefinition(id: string): WorkflowDefinition | undefined {
    const handler = this.handlers.get(id);
    return handler?.definition;
  }

  list(): readonly string[] {
    return Array.from(this.handlers.keys());
  }

  listHandlers(): readonly WorkflowHandler[] {
    return Array.from(this.handlers.values());
  }

  has(id: string): boolean {
    return this.handlers.has(id);
  }

  count(): number {
    return this.handlers.size;
  }

  clear(): void {
    this.handlers.clear();
  }

  validateAll(): readonly WorkflowValidationIssue[] {
    const issues: WorkflowValidationIssue[] = [];

    Array.from(this.handlers.values()).forEach((handler: WorkflowHandler) => {
      const def = handler.definition;
      const stateIds = new Set(def.states.map((s) => s.id));

      if (!stateIds.has(def.initialState)) {
        issues.push({
          field: `${def.id}.initialState`,
          message: `Initial state "${def.initialState}" not found in workflow states`,
        });
      }

      def.transitions.forEach((t: { from: string; to: string }) => {
        if (!stateIds.has(t.from)) {
          issues.push({
            field: `${def.id}.transitions`,
            message: `Transition from "${t.from}" references unknown state`,
          });
        }
        if (!stateIds.has(t.to)) {
          issues.push({
            field: `${def.id}.transitions`,
            message: `Transition to "${t.to}" references unknown state`,
          });
        }
      });
    });

    return issues;
  }
}
