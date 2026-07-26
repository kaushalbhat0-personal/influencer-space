export interface BuilderCommand {
  type: string;
  execute(): void;
  undo(): void;
}

export class MoveSectionCommand implements BuilderCommand {
  type = "move-section";
  constructor(
    private sectionId: string,
    private fromIndex: number,
    private toIndex: number,
    private reorderFn: (id: string, to: number) => void,
    private restoreFn: (id: string, from: number) => void,
  ) {}
  execute() { this.reorderFn(this.sectionId, this.toIndex); }
  undo() { this.restoreFn(this.sectionId, this.fromIndex); }
}

export class ToggleVisibilityCommand implements BuilderCommand {
  type = "toggle-visibility";
  constructor(
    private elementId: string,
    private wasVisible: boolean,
    private toggleFn: (id: string, visible: boolean) => void,
  ) {}
  execute() { this.toggleFn(this.elementId, !this.wasVisible); }
  undo() { this.toggleFn(this.elementId, this.wasVisible); }
}

export class ChangeVariantCommand implements BuilderCommand {
  type = "change-variant";
  constructor(
    private sectionId: string,
    private oldVariant: string,
    private newVariant: string,
    private applyFn: (id: string, variant: string) => void,
  ) {}
  execute() { this.applyFn(this.sectionId, this.newVariant); }
  undo() { this.applyFn(this.sectionId, this.oldVariant); }
}

export class UpdateSpacingCommand implements BuilderCommand {
  type = "update-spacing";
  constructor(
    private sectionId: string,
    private key: string,
    private oldValue: unknown,
    private newValue: unknown,
    private updateFn: (id: string, key: string, value: unknown) => void,
  ) {}
  execute() { this.updateFn(this.sectionId, this.key, this.newValue); }
  undo() { this.updateFn(this.sectionId, this.key, this.oldValue); }
}

export class ChangeThemeCommand implements BuilderCommand {
  type = "change-theme";
  constructor(
    private oldTheme: Record<string, unknown>,
    private newTheme: Record<string, unknown>,
    private applyFn: (theme: Record<string, unknown>) => void,
  ) {}
  execute() { this.applyFn(this.newTheme); }
  undo() { this.applyFn(this.oldTheme); }
}

export class AddSectionCommand implements BuilderCommand {
  type = "add-section";
  constructor(
    private sectionId: string,
    private addFn: (id: string) => void,
    private removeFn: (id: string) => void,
  ) {}
  execute() { this.addFn(this.sectionId); }
  undo() { this.removeFn(this.sectionId); }
}

export class RemoveSectionCommand implements BuilderCommand {
  type = "remove-section";
  constructor(
    private sectionId: string,
    private addFn: (id: string) => void,
    private removeFn: (id: string) => void,
  ) {}
  execute() { this.removeFn(this.sectionId); }
  undo() { this.addFn(this.sectionId); }
}
