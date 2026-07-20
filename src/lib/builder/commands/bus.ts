import type { BuilderCommand, CommandResult } from "./types";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

export class CommandRegistry {
  private commands = new Map<string, BuilderCommand>();

  register<T>(command: BuilderCommand<T>): void {
    this.commands.set(command.name, command as BuilderCommand);
  }

  get(name: string): BuilderCommand | null {
    return this.commands.get(name) ?? null;
  }

  list(): BuilderCommand[] {
    return Array.from(this.commands.values());
  }

  listByCategory(category: string): BuilderCommand[] {
    return this.list().filter((c) => c.category === category);
  }

  get size(): number { return this.commands.size; }
}

export class CommandBus {
  private registry: CommandRegistry;
  private history: CommandResult[] = [];
  private undoStack: Array<{ command: BuilderCommand; result: CommandResult }> = [];
  private redoStack: Array<{ command: BuilderCommand; result: CommandResult }> = [];
  private transactionId: string | null = null;

  constructor(registry: CommandRegistry) {
    this.registry = registry;
  }

  execute<T>(name: string, input: T): CommandResult {
    const cmd = this.registry.get(name);
    if (!cmd) return { success: false, commandId: "", commandName: name, executedAt: Date.now(), durationMs: 0, error: `Unknown command: "${name}"`, data: null };

    const span = platformTelemetry.startSpan(`command.${name}`);
    const start = performance.now();

    try {
      const id = `${name}_${Date.now()}`;
      const ctx = { timestamp: Date.now(), commandId: id, transactionId: this.transactionId };
      if (!cmd.canExecute(input)) {
        return { success: false, commandId: id, commandName: name, executedAt: Date.now(), durationMs: 0, error: `Cannot execute "${name}": precondition failed`, data: null };
      }
      const result = cmd.execute(input, ctx);
      this.history.push(result);
      if (cmd.category === "mutation" || cmd.category === "selection") {
        this.undoStack.push({ command: cmd, result });
        this.redoStack = [];
      }
      platformTelemetry.counter(`command.${name}`, 1);
      platformTelemetry.timer(`command.${name}`, performance.now() - start);
      const duration = Math.round((performance.now() - start) * 100) / 100;
      platformTelemetry.endSpan(span);
      return { ...result, durationMs: duration, commandId: id };
    } catch (e) {
      platformTelemetry.endSpan(span, e instanceof Error ? e : undefined);
      return { success: false, commandId: "", commandName: name, executedAt: Date.now(), durationMs: Math.round((performance.now() - start) * 100) / 100, error: e instanceof Error ? e.message : String(e), data: null };
    }
  }

  undo(): CommandResult | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    const result = entry.command.undo({ timestamp: Date.now(), commandId: `undo_${entry.command.name}`, transactionId: null });
    this.redoStack.push(entry);
    return result;
  }

  redo(): CommandResult | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    const result = entry.command.execute(null, { timestamp: Date.now(), commandId: `redo_${entry.command.name}`, transactionId: null });
    this.undoStack.push({ command: entry.command, result });
    return result;
  }

  canUndo(): boolean { return this.undoStack.length > 0; }
  canRedo(): boolean { return this.redoStack.length > 0; }

  beginTransaction(id: string): void { this.transactionId = id; }
  endTransaction(): void { this.transactionId = null; }

  getHistory(): CommandResult[] { return [...this.history]; }

  getDiagnostics(): { total: number; registered: number; undoDepth: number; redoDepth: number; byCategory: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    for (const cmd of this.registry.list()) { byCategory[cmd.category] = (byCategory[cmd.category] ?? 0) + 1; }
    return { total: this.history.length, registered: this.registry.size, undoDepth: this.undoStack.length, redoDepth: this.redoStack.length, byCategory };
  }
}
