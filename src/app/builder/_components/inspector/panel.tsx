"use client";

import { useState, useCallback, memo } from "react";
import { builderStore } from "@/lib/builder/store";
import { builderQuery } from "@/lib/builder/query";
import { getComponentSchema } from "@/lib/inspector/schemas";
import { FieldRenderer } from "@/lib/inspector/fields";
import { Settings, Sparkles, RefreshCw, AlertCircle } from "lucide-react";

export const PropertyInspector = memo(function PropertyInspector() {
  const selection = builderQuery.getSelection();
  const hierarchy = builderQuery.getCanvasHierarchy();

  const selectedId = selection.ids[0];
  const selectedSlot = selectedId ? hierarchy.slots.find((s) => s.id === selectedId) : null;
  const componentId = selectedSlot?.moduleId || "";

  const schema = getComponentSchema(componentId);
  const currentProps = selectedSlot?.config || {};

  const [, forceUpdate] = useState(0);

  const handleChange = useCallback((key: string, value: unknown) => {
    if (!selectedId) return;
    // Update the block config in the store
    builderStore.updateBlockConfig(selectedId, key, value);
    forceUpdate((n) => n + 1);
    builderStore.markDirty();
  }, [selectedId]);

  if (!selectedId) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <Settings className="mx-auto h-6 w-6 text-zinc-700" />
          <p className="mt-2 text-xs text-zinc-600">Select a component on the canvas to edit its properties.</p>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-zinc-700" />
          <p className="mt-2 text-xs text-zinc-600">No editable properties for this component.</p>
          <p className="text-[10px] text-zinc-700 mt-1">{componentId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-xs font-semibold text-zinc-300">Properties</span>
        <div className="flex items-center gap-1">
          {schema.groups.some((g) => g.fields.some((f) => f.aiEditable)) && (
            <button className="rounded p-1 text-zinc-600 hover:text-zinc-400" title="AI Regenerate">
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Selected component info */}
      <div className="border-b border-white/5 px-3 py-2">
        <p className="text-xs font-medium text-zinc-300">{componentId}</p>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {schema.groups.map((group) => (
          <div key={group.id}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{group.label}</p>
            <div className="space-y-3">
              {group.fields.map((field) => {
                const value = currentProps[field.key] ?? field.defaultValue;
                return (
                  <div key={field.key} className="relative">
                    <FieldRenderer def={field} value={value} onChange={handleChange} />
                    {field.aiRegenerate && (
                      <button
                        className="absolute right-0 top-0 rounded p-0.5 text-zinc-700 hover:text-zinc-500"
                        title="AI regenerate this field"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
