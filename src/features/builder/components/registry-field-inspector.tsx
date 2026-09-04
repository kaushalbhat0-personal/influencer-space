"use client";

import { useSyncExternalStore, useMemo } from "react";
import { builderStore } from "@/lib/builder/store";
import { builderEvents } from "@/lib/builder/events";
import { componentRegistry } from "@/lib/registry/components";
import { withCapabilityState } from "@/lib/registry/components/fields";
import { capabilityService } from "@/lib/capabilities";

/**
 * RCCF-VISUAL-02B-01 — Registry-driven field inspector (proof for 2 types).
 *
 * Consumes the SAME `componentRegistry.get(id).fields` that LayoutEngine
 * uses for defaults + resolveData. No duplicated field definitions.
 * Capability-aware: fields with requiresCapability are disabled when the
 * tenant plan lacks the capability (upgrade hint shown).
 *
 * Serializability: fields are plain JSON (no forwardRef/icons/functions)
 * — safe for RSC wire via wire.ts serializer.
 */
export function RegistryFieldInspector({ planCode }: { planCode?: string | null }) {
  const subscribe = (cb: () => void) => builderEvents.subscribe("store:changed", () => cb());
  useSyncExternalStore(subscribe, () => builderStore.getSelectedSlot()?.id ?? "");
  const slot = builderStore.getSelectedSlot();
  if (!slot) return null;
  const def = componentRegistry.get(slot.moduleId);
  const fields = def?.fields;
  if (!fields || fields.length === 0) return null;

  const can = (cap: string) => capabilityService.can(planCode ?? "creator_free", cap).allowed;
  const fieldsWithState = useMemo(() => withCapabilityState(fields, can), [fields, planCode]);

  const currentConfig = slot.config as Record<string, unknown>;

  const updateField = (name: string, value: unknown) => {
    const field = fields.find((f) => f.name === name);
    if (field?.requiresCapability && !can(field.requiresCapability)) return;
    builderStore.updateBlockConfig(slot.id, name, value);
  };

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-zinc-900/50 p-3" data-testid="registry-field-inspector" data-component-id={slot.moduleId}>
      <p className="text-[9px] font-medium text-indigo-300 uppercase tracking-wider">Registry Fields — {def?.name}</p>
      <p className="mt-0.5 text-[10px] text-zinc-500">Same metadata drives Builder + LayoutEngine. Capability-aware, wire-safe.</p>
      <div className="mt-3 space-y-3">
        {fieldsWithState.map((field) => {
          const value = currentConfig[field.name] ?? field.defaultValue;
          const disabled = field.disabled;
          return (
            <label key={field.name} className="flex flex-col gap-1 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                {field.label}
                {field.requiresCapability && <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[8px] font-semibold text-amber-300">premium</span>}
                {disabled && <span className="text-[9px] text-amber-400">Upgrade required</span>}
              </span>
              {field.description && <span className="text-[10px] text-zinc-600">{field.description}</span>}
              {field.type === "number" && (
                <input
                  type="number"
                  value={typeof value === "number" ? value : Number(value) || 0}
                  min={field.validation?.min}
                  max={field.validation?.max}
                  disabled={disabled}
                  onChange={(e) => updateField(field.name, Number(e.target.value))}
                  className="admin-input px-2 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid={`field-${field.name}`}
                />
              )}
              {field.type === "text" && (
                <input
                  type="text"
                  value={String(value ?? "")}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="admin-input px-2 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid={`field-${field.name}`}
                />
              )}
              {field.type === "boolean" && (
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  disabled={disabled}
                  onChange={(e) => updateField(field.name, e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-zinc-900 accent-indigo-500 disabled:opacity-50"
                  data-testid={`field-${field.name}`}
                />
              )}
              {field.type === "select" && (
                <select
                  value={String(value ?? field.defaultValue ?? "")}
                  disabled={disabled}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="admin-input px-2 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid={`field-${field.name}`}
                >
                  {(field.options ?? []).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
