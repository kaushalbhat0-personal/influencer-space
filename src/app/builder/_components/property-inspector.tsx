"use client";

import { useState, useEffect, useMemo } from "react";
import { Settings, Search, Pin, Clock, Smartphone, Tablet, Monitor, Eye, EyeOff, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import type { PropertyDescriptor, ResolvedProperties } from "@/lib/builder/properties";
import { propertyResolver, inspectorState } from "@/lib/builder/properties";
import { propertyRegistry } from "@/lib/builder/properties";
import { builderQuery } from "@/lib/builder/query";
import { builderEvents } from "@/lib/builder/events";
import { propertyEditorRegistry } from "./property-editors";
import { styleClipboard, propertyPresets, multiEditManager } from "@/lib/builder/properties";

export function PropertyInspector() {
  const [, forceUpdate] = useState(0);
  const selection = builderQuery.getSelection();
  const state = inspectorState.state;

  useEffect(() => {
    const handler = () => forceUpdate((n) => n + 1);
    const unsubs = [
      builderEvents.subscribe("node:selected", handler),
      builderEvents.subscribe("node:deselected", handler),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const resolved: ResolvedProperties | null = useMemo(() => {
    if (selection.ids.length !== 1) return null;
    return propertyResolver.resolve(selection.ids[0]!);
  }, [selection.ids]);

  if (!resolved) return <EmptyState message="Select a module to edit properties" />;

  let filtered = resolved.properties;
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter((p) => p.label.toLowerCase().includes(q) || p.key.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }

  const pinnedDescriptors = filtered.filter((p) => state.pinnedProperties.has(p.id));
  const unpinnedDescriptors = filtered.filter((p) => !state.pinnedProperties.has(p.id));

  const groups = propertyRegistry.getGroups(resolved.moduleId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <Settings className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Properties</span>
        {state.readOnly && <EyeOff className="ml-auto h-3 w-3 text-amber-500" />}
      </div>

      <div className="border-b border-white/5 px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-2 py-1">
          <Search className="h-3 w-3 text-zinc-600" />
          <input
            value={state.searchQuery}
            onChange={(e) => inspectorState.setSearch(e.target.value)}
            placeholder={`Search ${resolved.properties.length} properties...`}
            className="flex-1 bg-transparent text-xs text-zinc-400 outline-none placeholder:text-zinc-700"
          />
          {state.searchQuery && (
            <button onClick={() => inspectorState.setSearch("")} className="text-zinc-600 hover:text-zinc-400">
              <span className="text-[10px]">Esc</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-white/5 px-3 py-1">
        {(["mobile", "tablet", "desktop"] as const).map((bp) => (
          <button
            key={bp}
            onClick={() => inspectorState.setBreakpoint(bp)}
            className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${state.responsiveBreakpoint === bp ? "bg-s8ul-cyan/10 text-s8ul-cyan" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            {bp === "mobile" ? <Smartphone className="h-3 w-3" /> : bp === "tablet" ? <Tablet className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
          </button>
        ))}
        <button onClick={() => inspectorState.setReadOnly(!state.readOnly)} className={`ml-auto rounded px-2 py-1 text-[10px] font-medium transition-colors ${state.readOnly ? "bg-amber-500/10 text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}>
          {state.readOnly ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      </div>

      {selection.ids.length > 1 && (
        <div className="flex items-center gap-1 border-b border-white/5 px-2 py-1">
          <span className="text-[9px] text-purple-400">{selection.ids.length} modules selected</span>
          <span className="ml-auto text-[9px] text-zinc-600">Multi-edit mode</span>
        </div>
      )}

      {selection.ids.length === 1 && (
        <div className="flex items-center gap-1 border-b border-white/5 px-2 py-0.5">
          <button onClick={() => {
            const descs = propertyRegistry.get(selection.ids[0]!);
            styleClipboard.copy(descs, selection.ids[0]!, resolved.moduleName, "all");
          }} disabled={!resolved} className="rounded px-1.5 py-0.5 text-[8px] text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400" title="Copy all styles">
            Copy Styles
          </button>
          <button onClick={() => {
            const entry = styleClipboard.paste();
            if (entry && selection.ids[0]) {
              for (const p of entry.properties) {
                const desc = resolved.properties.find((d) => d.key === p.key);
                if (desc) inspectorState.updateProperty(desc.id, p.value);
              }
            }
          }} disabled={!styleClipboard.hasEntry()} className="rounded px-1.5 py-0.5 text-[8px] text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400 disabled:opacity-30" title="Paste copied styles">
            Paste Styles
          </button>
          <button onClick={() => {
            const name = prompt("Preset name:");
            if (name && selection.ids[0]) {
              const descs = propertyRegistry.get(selection.ids[0]!);
              propertyPresets.save(name, "all", descs, resolved.moduleId);
            }
          }} className="ml-auto rounded px-1.5 py-0.5 text-[8px] text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400" title="Save as preset">
            Save Preset
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="mb-1 px-1">
          <span className="text-[10px] font-semibold text-zinc-500">{resolved.moduleName}</span>
          <span className="ml-2 text-[9px] text-zinc-700">{resolved.properties.length} properties</span>
          {selection.ids.length > 1 && <span className="ml-1 text-[9px] text-amber-500">{multiEditManager.resolve(selection.ids, new Map([[selection.ids[0]!, resolved.properties]])).conflictCount > 0 ? " (mixed)" : ""}</span>}
        </div>

        {state.searchQuery && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Search className="h-5 w-5 text-zinc-700" />
            <p className="text-xs text-zinc-600">No properties match &ldquo;{state.searchQuery}&rdquo;</p>
          </div>
        )}

        {pinnedDescriptors.length > 0 && (
          <GroupSection icon={Pin} title="Pinned" count={pinnedDescriptors.length} defaultExpanded={true}>
            {pinnedDescriptors.map((prop) => <PropertyRow key={prop.id} prop={prop} pinned />)}
          </GroupSection>
        )}

        {!state.searchQuery && groups.map((group) => {
          const groupProps = unpinnedDescriptors.filter((p) => p.group === group.id);
          if (groupProps.length === 0) return null;
          return (
            <GroupSection key={group.id} icon={group.icon} title={group.label} count={groupProps.length} defaultExpanded={group.defaultExpanded} groupId={group.id}>
              {groupProps.map((prop) => <PropertyRow key={prop.id} prop={prop} />)}
            </GroupSection>
          );
        })}

        {filtered.length === 0 && resolved.properties.length > 0 && !state.searchQuery && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="h-5 w-5 text-zinc-700" />
            <p className="text-xs text-zinc-600">No visible properties</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupSection({ icon, title, count, defaultExpanded, groupId, children }: {
  icon: string | React.ComponentType<{ className?: string }>; title: string; count: number; defaultExpanded?: boolean; groupId?: string; children: React.ReactNode;
}) {
  const state = inspectorState.state;
  const expanded = groupId ? state.expandedGroups.has(groupId) : (defaultExpanded ?? false);

  const handleToggle = () => { if (groupId) inspectorState.toggleGroup(groupId); };

  const IconComponent = typeof icon === "string" ? getIconComponent(icon) : icon;

  return (
    <div className="rounded-lg border border-white/5 bg-zinc-900/50 overflow-hidden">
      <button onClick={handleToggle} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-zinc-900/80 transition-colors">
        {expanded ? <ChevronDown className="h-3 w-3 text-zinc-600" /> : <ChevronRight className="h-3 w-3 text-zinc-600" />}
        {IconComponent && <IconComponent className="h-3 w-3 text-zinc-600" />}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{title}</span>
        <span className="ml-auto text-[9px] text-zinc-700">{count}</span>
      </button>
      {expanded && <div className="px-3 pb-2 space-y-0.5">{children}</div>}
    </div>
  );
}

function PropertyRow({ prop, pinned }: { prop: PropertyDescriptor; pinned?: boolean }) {
  const state = inspectorState.state;
  const isPinned = pinned || state.pinnedProperties.has(prop.id);

  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          <span className="truncate text-[10px] text-zinc-400">{prop.label}</span>
          {prop.required && <span className="text-[9px] text-red-500">*</span>}
          {prop.responsive && <span className="text-[9px] text-purple-400">R</span>}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => isPinned ? inspectorState.unpinProperty(prop.id) : inspectorState.pinProperty(prop.id)}
            className={`rounded p-0.5 transition-colors ${isPinned ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"}`}
            title={isPinned ? "Unpin" : "Pin"}
          >
            <Pin className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
      <PropertyEditorRenderer prop={prop} />
    </div>
  );
}

function PropertyEditorRenderer({ prop }: { prop: PropertyDescriptor }) {
  const state = inspectorState.state;
  const editor = propertyEditorRegistry.get(prop.editorType as Parameters<typeof propertyEditorRegistry.get>[0]);

  if (!editor) {
    return (
      <div className="rounded bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-600">
        Unknown editor: {prop.editorType}
      </div>
    );
  }

  const EditorComponent = editor.component;

  return (
    <EditorComponent
      prop={prop}
      value={prop.currentValue}
      onChange={(value) => inspectorState.updateProperty(prop.id, value)}
      readOnly={state.readOnly || prop.readOnly}
      hasError={false}
    />
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <Settings className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Properties</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Settings className="h-8 w-8 text-zinc-800" />
        <p className="text-xs text-zinc-600 text-center">{message}</p>
      </div>
    </div>
  );
}

function getIconComponent(name: string): React.ComponentType<{ className?: string }> | null {
  const icons: Record<string, React.ComponentType<{ className?: string }>> = {
    Type: ({ className }) => <span className={className}>T</span>,
    Layout: ({ className }) => <span className={className}>▦</span>,
    Space: ({ className }) => <span className={className}>↔</span>,
    Font: ({ className }) => <span className={className}>F</span>,
    PaintBucket: ({ className }) => <span className={className}>▣</span>,
    Square: ({ className }) => <span className={className}>□</span>,
    Wand: ({ className }) => <span className={className}>✦</span>,
    Play: ({ className }) => <span className={className}>▶</span>,
    Smartphone: ({ className }) => <span className={className}>📱</span>,
    Settings: ({ className }) => <Settings className={className} />,
    Search: ({ className }) => <Search className={className} />,
    Eye: ({ className }) => <Eye className={className} />,
    Puzzle: ({ className }) => <span className={className}>🧩</span>,
    Clock: ({ className }) => <Clock className={className} />,
  };
  return icons[name] ?? null;
}
