import type { PropertyDescriptor, ResolvedProperties, PropertyInspectorState } from "./types";

import { propertyRegistry } from "./registry";
import { builderQuery } from "../query";
import { builderCommands } from "../commands";
import { builderEvents } from "../events";
import { interactionPolicy } from "../policy";
import { documentValidator } from "../validation";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

export class PropertyResolver {
  resolve(moduleId: string): ResolvedProperties {
    const start = performance.now();
    const entry = registryFacade.module.get(moduleId);
    const moduleName = entry?.definition.identity.name ?? moduleId;

    if (!propertyRegistry.has(moduleId)) {
      propertyRegistry.registerFromMetadata(moduleId);
    }

    let properties = propertyRegistry.get(moduleId);

    const selection = builderQuery.getSelection();
    if (selection.ids.length === 1 && selection.ids[0] !== moduleId) {
      properties = [];
    }

    const filtered = properties.filter((p) => p.visible);
    const groups = propertyRegistry.getGroups(moduleId);

    platformTelemetry.timer("builder.property.resolve", performance.now() - start);

    return {
      moduleId,
      moduleName,
      properties: filtered,
      groups,
      empty: filtered.length === 0,
    };
  }

  resolveAll(): ResolvedProperties[] {
    const moduleIds = registryFacade.module.listIds();
    return moduleIds.map((id) => this.resolve(id)).filter((r) => !r.empty);
  }

  search(query: string): PropertyDescriptor[] {
    return propertyRegistry.list({ search: query });
  }
}

export class PropertyInspectorStateManager {
  private _state: PropertyInspectorState = {
    selectedModuleId: null,
    expandedGroups: new Set(["content", "layout"]),
    searchQuery: "",
    pinnedProperties: new Set(),
    recentlyEdited: [],
    responsiveBreakpoint: "desktop",
    readOnly: false,
  };

  get state(): PropertyInspectorState { return { ...this._state, expandedGroups: new Set(this._state.expandedGroups), pinnedProperties: new Set(this._state.pinnedProperties), recentlyEdited: [...this._state.recentlyEdited] }; }

  selectModule(moduleId: string | null): void {
    this._state.selectedModuleId = moduleId;
    if (moduleId) propertyRegistry.registerFromMetadata(moduleId);
    builderCommands.execute("selectNode", { elementId: moduleId ?? "", multi: false });
  }

  toggleGroup(groupId: string): void {
    const set = this._state.expandedGroups;
    if (set.has(groupId)) set.delete(groupId); else set.add(groupId);
  }

  setSearch(query: string): void { this._state.searchQuery = query; }

  pinProperty(descriptorId: string): void { this._state.pinnedProperties.add(descriptorId); }
  unpinProperty(descriptorId: string): void { this._state.pinnedProperties.delete(descriptorId); }

  recordEdit(propertyKey: string): void {
    this._state.recentlyEdited.unshift(propertyKey);
    if (this._state.recentlyEdited.length > 20) this._state.recentlyEdited.pop();
  }

  setBreakpoint(bp: PropertyInspectorState["responsiveBreakpoint"]): void { this._state.responsiveBreakpoint = bp; }
  setReadOnly(ro: boolean): void { this._state.readOnly = ro; }

  canEdit(moduleId: string): boolean {
    const entry = registryFacade.module.get(moduleId);
    if (!entry) return false;
    const policy = interactionPolicy.evaluate("canEdit", {
      elementId: moduleId, sectionId: null, pageId: null,
      role: "ADMIN", plan: "PRO", isLocked: false, isHidden: false,
      isReadOnly: this._state.readOnly, isDraft: false, metadata: {},
    });
    return policy.allowed;
  }

  updateProperty(descriptorId: string, value: unknown): { success: boolean; error?: string } {
    void value;
    const descriptor = propertyRegistry.getById(descriptorId);
    if (!descriptor) return { success: false, error: "Property not found" };

    if (!this.canEdit(descriptor.moduleId)) return { success: false, error: "Cannot edit this module" };

    this.recordEdit(descriptor.key);

    const result = builderCommands.execute("selectNode", { elementId: descriptor.moduleId, multi: false });
    if (!result.success) return { success: false, error: result.error ?? "Command failed" };

    builderEvents.emit("selection:changed" as never, { selectedIds: [descriptor.moduleId], mode: "single" } as never);

    const canvas = { pages: builderQuery.getCurrentPage() ? [builderQuery.getCurrentPage()!] : [] };
    documentValidator.validate(canvas as Parameters<typeof documentValidator.validate>[0]);

    return { success: true };
  }

  reset(): void {
    this._state = {
      selectedModuleId: null, expandedGroups: new Set(["content", "layout"]),
      searchQuery: "", pinnedProperties: new Set(), recentlyEdited: [],
      responsiveBreakpoint: "desktop", readOnly: false,
    };
  }
}

import { registryFacade } from "@/lib/registry/facade";

export const propertyResolver = new PropertyResolver();
export const inspectorState = new PropertyInspectorStateManager();
