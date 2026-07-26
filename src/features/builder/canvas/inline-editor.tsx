"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { builderStore } from "@/lib/builder/store";
import { getComponentSchema } from "@/lib/inspector/schemas";

interface EditableTextProps {
  componentId: string;
  elementId: string;
  fieldKey: string;
  value: string;
}

/** Renders text that becomes editable on click. Schema-driven — no component-specific logic. */
export function EditableText({ componentId, elementId, fieldKey, value }: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputRef = useRef<any>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const schema = getComponentSchema(componentId);
  const field = schema?.groups.flatMap((g) => g.fields).find((f) => f.key === fieldKey);
  const isTextarea = field?.type === "textarea";

  const startEditing = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  const save = useCallback(() => {
    setEditing(false);
    if (draft !== value) {
      builderStore.updateBlockConfig(elementId, fieldKey, draft);
      builderStore.markDirty();
    }
  }, [draft, value, elementId, fieldKey]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setEditing(false); setDraft(value); }
    if (e.key === "Enter" && !isTextarea) { save(); }
  }, [value, save, isTextarea]);

  if (editing) {
    const InputTag = isTextarea ? "textarea" : "input";
    return (
      <InputTag
        ref={inputRef}
        type={isTextarea ? undefined : "text"}
        value={draft}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className="inline-block w-full rounded border border-s8ul-cyan/50 bg-zinc-900 px-1 text-inherit outline-none ring-1 ring-s8ul-cyan/30"
        style={{ minWidth: 50, fontSize: "inherit", fontFamily: "inherit", lineHeight: "inherit", textAlign: "inherit" }}
      />
    );
  }

  return (
    <span
      onClick={startEditing}
      className="cursor-text rounded px-0.5 transition-colors hover:bg-white/5 hover:ring-1 hover:ring-white/10"
      title={`Edit ${field?.label || fieldKey}`}
    >
      {value || String(field?.defaultValue ?? "")}
    </span>
  );
}

/** Inline editing overlay — provides context for editable fields on the canvas. */
export function InlineEditOverlay({
  componentId,
}: {
  componentId: string;
}) {
  const schema = getComponentSchema(componentId);
  if (!schema) return null;

  const editableFields = schema.groups
    .flatMap((g) => g.fields)
    .filter((f) => f.inlineEditable);

  if (editableFields.length === 0) return null;

  return (
    <div className="inline-edit-overlay" data-inline-edit-count={editableFields.length}>
      {/* Editable fields are rendered inline by the component's renderer */}
    </div>
  );
}
