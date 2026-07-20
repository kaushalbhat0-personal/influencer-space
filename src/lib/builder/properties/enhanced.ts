import type { PropertyDescriptor } from "./types";

export interface EditingSession {
  moduleId: string;
  propertyKey: string;
  originalValue: unknown;
  currentValue: unknown;
  startedAt: number;
  editorType: string;
  dirty: boolean;
}

export interface StyleClipboardEntry {
  category: string;
  properties: Array<{ key: string; value: unknown; group: string }>;
  sourceModuleId: string;
  sourceModuleName: string;
  timestamp: number;
}

export interface PropertyPreset {
  id: string;
  name: string;
  category: string;
  values: Array<{ key: string; value: unknown }>;
  moduleType: string;
  createdAt: string;
}

export interface MultiEditResult {
  moduleIds: string[];
  sharedProperties: PropertyDescriptor[];
  compatible: boolean;
  conflictCount: number;
}

export interface ResponsiveValue {
  desktop: unknown;
  tablet: unknown;
  mobile: unknown;
  active: boolean;
}

export class StyleClipboard {
  private entry: StyleClipboardEntry | null = null;

  copy(descriptors: PropertyDescriptor[], moduleId: string, moduleName: string, category: string): StyleClipboardEntry {
    this.entry = {
      category,
      properties: descriptors.filter((p) => p.group === category || category === "all").map((p) => ({ key: p.key, value: p.currentValue ?? p.defaultValue, group: p.group })),
      sourceModuleId: moduleId,
      sourceModuleName: moduleName,
      timestamp: Date.now(),
    };
    return this.entry;
  }

  paste(): StyleClipboardEntry | null { return this.entry; }
  hasEntry(): boolean { return this.entry !== null; }
  clear(): void { this.entry = null; }
}

export class PropertyPresetStore {
  private presets: PropertyPreset[] = [];

  save(name: string, category: string, descriptors: PropertyDescriptor[], moduleType: string): PropertyPreset {
    const preset: PropertyPreset = {
      id: `preset_${Date.now()}`, name, category,
      values: descriptors.map((p) => ({ key: p.key, value: p.currentValue ?? p.defaultValue })),
      moduleType, createdAt: new Date().toISOString(),
    };
    this.presets.push(preset);
    return preset;
  }

  list(moduleType?: string): PropertyPreset[] {
    return moduleType ? this.presets.filter((p) => p.moduleType === moduleType || p.moduleType === "*") : [...this.presets];
  }

  get(id: string): PropertyPreset | null { return this.presets.find((p) => p.id === id) ?? null; }
  delete(id: string): boolean { const idx = this.presets.findIndex((p) => p.id === id); if (idx >= 0) { this.presets.splice(idx, 1); return true; } return false; }
  get size(): number { return this.presets.length; }
}

export class MultiEditManager {
  resolve(moduleIds: string[], allDescriptors: Map<string, PropertyDescriptor[]>): MultiEditResult {
    if (moduleIds.length <= 1) {
      return { moduleIds, sharedProperties: [], compatible: false, conflictCount: 0 };
    }

    const first = allDescriptors.get(moduleIds[0]!);
    if (!first) return { moduleIds, sharedProperties: [], compatible: false, conflictCount: 0 };

    const shared: PropertyDescriptor[] = [];
    let conflicts = 0;

    for (const desc of first) {
      let allHave = true;
      let hasConflict = false;
      const firstVal = JSON.stringify(desc.currentValue ?? desc.defaultValue);
      for (let i = 1; i < moduleIds.length; i++) {
        const other = allDescriptors.get(moduleIds[i]!)?.find((d) => d.key === desc.key);
        if (!other) { allHave = false; break; }
        if (JSON.stringify(other.currentValue ?? other.defaultValue) !== firstVal) hasConflict = true;
      }
      if (allHave) {
        shared.push(desc);
        if (hasConflict) conflicts++;
      }
    }

    return { moduleIds, sharedProperties: shared, compatible: shared.length > 0, conflictCount: conflicts };
  }
}

export const styleClipboard = new StyleClipboard();
export const propertyPresets = new PropertyPresetStore();
export const multiEditManager = new MultiEditManager();
