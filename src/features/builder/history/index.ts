import type { BuilderCommand } from "../commands";

const MAX_HISTORY = 50;

export interface HistoryEntry {
  commands: BuilderCommand[];
  timestamp: number;
  label: string;
}

export class BuilderHistory {
  private entries: HistoryEntry[] = [];
  private index = -1;

  get canUndo(): boolean {
    return this.index >= 0;
  }

  get canRedo(): boolean {
    return this.index < this.entries.length - 1;
  }

  get currentLabel(): string | null {
    return this.index >= 0 && this.index < this.entries.length
      ? this.entries[this.index].label
      : null;
  }

  push(commands: BuilderCommand[], label: string): void {
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push({ commands, timestamp: Date.now(), label });
    if (this.entries.length > MAX_HISTORY) {
      this.entries.shift();
    }
    this.index = this.entries.length - 1;
  }

  undo(): BuilderCommand[] | null {
    if (!this.canUndo) return null;
    const entry = this.entries[this.index];
    this.index--;
    const reversed = [...entry.commands].reverse();
    for (const cmd of reversed) {
      cmd.undo();
    }
    return entry.commands;
  }

  redo(): BuilderCommand[] | null {
    if (!this.canRedo) return null;
    this.index++;
    const entry = this.entries[this.index];
    for (const cmd of entry.commands) {
      cmd.execute();
    }
    return entry.commands;
  }

  clear(): void {
    this.entries = [];
    this.index = -1;
  }

  get size(): number {
    return this.entries.length;
  }

  snapshot(): HistoryEntry[] {
    return this.entries;
  }
}

export const builderHistory = new BuilderHistory();
