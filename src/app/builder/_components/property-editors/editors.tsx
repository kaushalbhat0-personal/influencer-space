"use client";

import { useState, useCallback, useEffect } from "react";
import type { PropertyEditorProps } from "./registry";

function BaseEditor({ prop, value: _value, onChange, readOnly, hasError, children }: PropertyEditorProps & { children: React.ReactNode }) {
  void _value;
  const [dirty, setDirty] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => { setDirty(false); setLocalError(null); }, [prop.id]);

  const handleReset = useCallback(() => {
    onChange(prop.defaultValue);
    setDirty(false);
    setLocalError(null);
  }, [prop, onChange]);

  return (
    <div className="space-y-1">
      <div className={`rounded ring-1 transition-all ${dirty ? "ring-amber-500/50" : readOnly ? "ring-zinc-800" : hasError ? "ring-red-500/50" : "ring-transparent"}`}>
        {children}
      </div>
      <div className="flex items-center gap-2">
        {dirty && (
          <button onClick={handleReset} className="text-[9px] text-amber-500 hover:text-amber-400">
            Reset
          </button>
        )}
        {localError && <span className="text-[9px] text-red-500">{localError}</span>}
        {prop.description && !localError && <span className="text-[9px] text-zinc-700 truncate">{prop.description}</span>}
      </div>
    </div>
  );
}

export function TextEditor(props: PropertyEditorProps) {
  const val = String(props.value ?? props.prop.defaultValue ?? "");
  return (
    <BaseEditor {...props}>
      <input
        type="text"
        value={val}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.readOnly}
        placeholder={props.prop.placeholder ?? "Enter text..."}
        className="w-full rounded bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-300 outline-none placeholder:text-zinc-700 disabled:opacity-50"
      />
    </BaseEditor>
  );
}

export function TextareaEditor(props: PropertyEditorProps) {
  const val = String(props.value ?? props.prop.defaultValue ?? "");
  return (
    <BaseEditor {...props}>
      <textarea
        value={val}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.readOnly}
        placeholder={props.prop.placeholder ?? "Enter text..."}
        rows={3}
        className="w-full resize-none rounded bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-300 outline-none placeholder:text-zinc-700 disabled:opacity-50"
      />
    </BaseEditor>
  );
}

export function NumberEditor(props: PropertyEditorProps) {
  const val = Number(props.value ?? props.prop.defaultValue ?? 0);
  const min = props.prop.validation?.minLength ?? props.prop.min ?? 0;
  const max = props.prop.validation?.maxLength ?? props.prop.max ?? 9999;
  const step = props.prop.step ?? 1;
  return (
    <BaseEditor {...props}>
      <div className="flex items-center gap-1 rounded bg-zinc-950 px-2 py-1">
        <button onClick={() => props.onChange(Math.max(min, val - step))} disabled={props.readOnly} className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-30">−</button>
        <input
          type="number"
          value={val}
          onChange={(e) => props.onChange(Number(e.target.value))}
          disabled={props.readOnly}
          min={min} max={max} step={step}
          className="w-full bg-transparent text-center text-[10px] text-zinc-300 outline-none disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button onClick={() => props.onChange(Math.min(max, val + step))} disabled={props.readOnly} className="text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-30">+</button>
      </div>
    </BaseEditor>
  );
}

export function BooleanEditor(props: PropertyEditorProps) {
  const val = Boolean(props.value ?? props.prop.defaultValue ?? false);
  return (
    <BaseEditor {...props}>
      <button
        onClick={() => props.onChange(!val)}
        disabled={props.readOnly}
        className={`flex w-full items-center gap-2 rounded bg-zinc-950 px-2 py-1.5 transition-colors disabled:opacity-50 ${val ? "bg-s8ul-cyan/10" : ""}`}
      >
        <div className={`h-3.5 w-7 rounded-full transition-colors ${val ? "bg-s8ul-cyan/40" : "bg-zinc-700"}`}>
          <div className={`h-2.5 w-2.5 rounded-full bg-white/90 mt-0.5 transition-transform ${val ? "ml-4" : "ml-0.5"}`} />
        </div>
        <span className="text-[10px] text-zinc-400">{val ? "On" : "Off"}</span>
      </button>
    </BaseEditor>
  );
}

export function SelectEditor(props: PropertyEditorProps) {
  const val = String(props.value ?? props.prop.defaultValue ?? "");
  const options = props.prop.options ?? [];
  return (
    <BaseEditor {...props}>
      <select
        value={val}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.readOnly}
        className="w-full rounded bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-300 outline-none disabled:opacity-50"
      >
        <option value="" disabled>{props.prop.placeholder ?? "Select..."}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </BaseEditor>
  );
}

export function ColorEditor(props: PropertyEditorProps) {
  const val = String(props.value ?? props.prop.defaultValue ?? "#000000");
  const [inputVal, setInputVal] = useState(val);
  return (
    <BaseEditor {...props}>
      <div className="flex items-center gap-2 rounded bg-zinc-950 px-2 py-1.5">
        <input
          type="color"
          value={val}
          onChange={(e) => props.onChange(e.target.value)}
          disabled={props.readOnly}
          className="h-5 w-7 cursor-pointer rounded border border-white/10 bg-transparent p-0 disabled:opacity-50"
        />
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={() => { if (/^#[0-9a-fA-F]{6}$/.test(inputVal)) props.onChange(inputVal); else setInputVal(val); }}
          disabled={props.readOnly}
          className="flex-1 bg-transparent text-[10px] font-mono text-zinc-300 outline-none disabled:opacity-50"
          placeholder="#000000"
        />
      </div>
    </BaseEditor>
  );
}

export function ImageEditor(props: PropertyEditorProps) {
  const val = String(props.value ?? props.prop.defaultValue ?? "");
  return (
    <BaseEditor {...props}>
      <div className="rounded bg-zinc-950 p-2">
        {val ? (
          <div className="relative">
            <div className="flex h-16 w-full items-center justify-center rounded bg-zinc-900">
              <span className="text-[9px] text-zinc-600 truncate max-w-[90%]">{val}</span>
            </div>
            <button onClick={() => props.onChange("")} disabled={props.readOnly} className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white disabled:opacity-50">
              <span className="text-[8px]">✕</span>
            </button>
          </div>
        ) : (
          <div className="flex h-16 items-center justify-center rounded border border-dashed border-zinc-700">
            <span className="text-[9px] text-zinc-600">No image</span>
          </div>
        )}
      </div>
    </BaseEditor>
  );
}

export function UrlEditor(props: PropertyEditorProps) {
  const val = String(props.value ?? props.prop.defaultValue ?? "");
  return (
    <BaseEditor {...props}>
      <input
        type="url"
        value={val}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.readOnly}
        placeholder="https://"
        className="w-full rounded bg-zinc-950 px-2 py-1.5 text-[10px] text-zinc-300 outline-none placeholder:text-zinc-700 disabled:opacity-50"
      />
    </BaseEditor>
  );
}

export function JsonEditor(props: PropertyEditorProps) {
  const val = props.value ?? props.prop.defaultValue ?? {};
  const str = typeof val === "string" ? val : JSON.stringify(val, null, 2);
  return (
    <BaseEditor {...props}>
      <textarea
        value={str}
        onChange={(e) => {
          try { props.onChange(JSON.parse(e.target.value)); } catch { /* invalid JSON during typing */ }
        }}
        disabled={props.readOnly}
        rows={4}
        className="w-full resize-none rounded bg-zinc-950 px-2 py-1.5 font-mono text-[9px] text-zinc-300 outline-none disabled:opacity-50"
        spellCheck={false}
      />
    </BaseEditor>
  );
}

import { propertyEditorRegistry } from "./registry";

propertyEditorRegistry.register("string", TextEditor, { label: "Text", supportsResponsive: true, supportsInlineEditing: true });
propertyEditorRegistry.register("text", TextareaEditor, { label: "Textarea", supportsResponsive: true, supportsInlineEditing: true });
propertyEditorRegistry.register("number", NumberEditor, { label: "Number", supportsResponsive: true });
propertyEditorRegistry.register("range", NumberEditor, { label: "Range", supportsResponsive: true });
propertyEditorRegistry.register("boolean", BooleanEditor, { label: "Toggle", supportsResponsive: false });
propertyEditorRegistry.register("select", SelectEditor, { label: "Select", supportsResponsive: false });
propertyEditorRegistry.register("color", ColorEditor, { label: "Color", supportsResponsive: false });
propertyEditorRegistry.register("image", ImageEditor, { label: "Image", supportsResponsive: false, supportsInlineEditing: true });
propertyEditorRegistry.register("url", UrlEditor, { label: "URL", supportsResponsive: true, supportsInlineEditing: true });
propertyEditorRegistry.register("json", JsonEditor, { label: "JSON", supportsResponsive: false });
