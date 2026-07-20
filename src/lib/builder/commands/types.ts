export interface CommandContext {
  timestamp: number;
  commandId: string;
  transactionId: string | null;
}

export interface CommandResult {
  success: boolean;
  commandId: string;
  commandName: string;
  executedAt: number;
  durationMs: number;
  error: string | null;
  data: unknown;
}

export interface BuilderCommand<TInput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly category: "selection" | "mutation" | "navigation" | "view" | "file" | "system";
  execute(input: TInput, ctx: CommandContext): CommandResult;
  undo(ctx: CommandContext): CommandResult;
  canExecute(input: TInput): boolean;
}
