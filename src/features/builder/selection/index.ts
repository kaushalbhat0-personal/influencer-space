export type SelectionMode = "single" | "multi" | "range";

export interface SelectionState {
  selectedIds: Set<string>;
  mode: SelectionMode;
  lastSelectedId: string | null;
}

export class BuilderSelection {
  private state: SelectionState = {
    selectedIds: new Set(),
    mode: "single",
    lastSelectedId: null,
  };

  private listeners: Set<(ids: string[]) => void> = new Set();

  get selected(): string[] {
    return Array.from(this.state.selectedIds);
  }

  get count(): number {
    return this.state.selectedIds.size;
  }

  get lastSelected(): string | null {
    return this.state.lastSelectedId;
  }

  get mode(): SelectionMode {
    return this.state.mode;
  }

  onChange(listener: (ids: string[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  select(id: string, mode?: SelectionMode): void {
    const m = mode ?? this.state.mode;
    if (m === "single" || m === "range") {
      this.state.selectedIds.clear();
    }
    this.state.selectedIds.add(id);
    this.state.lastSelectedId = id;
    this.state.mode = m;
    this.notify();
  }

  toggle(id: string): void {
    if (this.state.selectedIds.has(id)) {
      this.state.selectedIds.delete(id);
    } else {
      this.state.selectedIds.add(id);
      this.state.lastSelectedId = id;
    }
    this.notify();
  }

  selectAll(ids: string[]): void {
    for (const id of ids) {
      this.state.selectedIds.add(id);
    }
    this.notify();
  }

  deselectAll(): void {
    this.state.selectedIds.clear();
    this.state.lastSelectedId = null;
    this.notify();
  }

  isSelected(id: string): boolean {
    return this.state.selectedIds.has(id);
  }

  setMode(mode: SelectionMode): void {
    this.state.mode = mode;
  }

  private notify(): void {
    const ids = this.selected;
    Array.from(this.listeners).forEach((listener) => {
      listener(ids);
    });
  }
}

export const builderSelection = new BuilderSelection();
