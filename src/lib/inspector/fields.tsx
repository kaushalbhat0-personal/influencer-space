"use client";

import type { FieldDefinition } from "./types";

interface FieldProps {
  def: FieldDefinition;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

/** Field renderer — selects the right component based on FieldDefinition.type */
export function FieldRenderer({ def, value, onChange }: FieldProps) {
  switch (def.type) {
    case "text": return <TextField def={def} value={value} onChange={onChange} />;
    case "textarea": return <TextareaField def={def} value={value} onChange={onChange} />;
    case "number": return <NumberField def={def} value={value} onChange={onChange} />;
    case "boolean": return <BooleanField def={def} value={value} onChange={onChange} />;
    case "select": return <SelectField def={def} value={value} onChange={onChange} />;
    case "color": return <ColorField def={def} value={value} onChange={onChange} />;
    case "url": return <TextField def={{ ...def, type: "text" }} value={value} onChange={onChange} />;
    case "slider": return <SliderField def={def} value={value} onChange={onChange} />;
    default: return <TextField def={def} value={value} onChange={onChange} />;
  }
}

/* ─── Individual Field Components ─────────────────────── */

function TextField({ def, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{def.label}</label>
      <input
        type="text"
        value={String(value ?? def.defaultValue ?? "")}
        onChange={(e) => onChange(def.key, e.target.value)}
        placeholder={def.placeholder}
        className="w-full rounded-md border border-white/5 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:border-s8ul-cyan/30 focus:outline-none focus:ring-1 focus:ring-s8ul-cyan/20"
      />
      {def.description && <p className="text-[10px] text-zinc-600">{def.description}</p>}
    </div>
  );
}

function TextareaField({ def, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{def.label}</label>
      <textarea
        value={String(value ?? def.defaultValue ?? "")}
        onChange={(e) => onChange(def.key, e.target.value)}
        placeholder={def.placeholder}
        rows={3}
        className="w-full resize-none rounded-md border border-white/5 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-700 focus:border-s8ul-cyan/30 focus:outline-none focus:ring-1 focus:ring-s8ul-cyan/20"
      />
    </div>
  );
}

function NumberField({ def, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{def.label}</label>
      <input
        type="number"
        value={String(value ?? def.defaultValue ?? 0)}
        onChange={(e) => onChange(def.key, Number(e.target.value))}
        min={def.validation?.min}
        max={def.validation?.max}
        className="w-full rounded-md border border-white/5 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-s8ul-cyan/30 focus:outline-none focus:ring-1 focus:ring-s8ul-cyan/20"
      />
    </div>
  );
}

function BooleanField({ def, value, onChange }: FieldProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={Boolean(value ?? def.defaultValue ?? false)}
        onChange={(e) => onChange(def.key, e.target.checked)}
        className="h-3.5 w-3.5 rounded border-white/5 bg-zinc-900 text-s8ul-cyan focus:ring-s8ul-cyan/20"
      />
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{def.label}</span>
    </label>
  );
}

function SelectField({ def, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{def.label}</label>
      <select
        value={String(value ?? def.defaultValue ?? "")}
        onChange={(e) => onChange(def.key, e.target.value)}
        className="w-full rounded-md border border-white/5 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-s8ul-cyan/30 focus:outline-none focus:ring-1 focus:ring-s8ul-cyan/20"
      >
        {def.options?.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function ColorField({ def, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{def.label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={String(value ?? def.defaultValue ?? "#000000")}
          onChange={(e) => onChange(def.key, e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-white/5 bg-transparent"
        />
        <input
          type="text"
          value={String(value ?? def.defaultValue ?? "")}
          onChange={(e) => onChange(def.key, e.target.value)}
          className="flex-1 rounded-md border border-white/5 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-s8ul-cyan/30 focus:outline-none focus:ring-1 focus:ring-s8ul-cyan/20"
        />
      </div>
    </div>
  );
}

function SliderField({ def, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{def.label}</label>
        <span className="text-[10px] text-zinc-600">{String(value ?? def.defaultValue ?? 0)}</span>
      </div>
      <input
        type="range"
        value={String(value ?? def.defaultValue ?? 0)}
        onChange={(e) => onChange(def.key, Number(e.target.value))}
        min={def.validation?.min ?? 0}
        max={def.validation?.max ?? 100}
        className="w-full h-1 cursor-pointer appearance-none rounded-full bg-zinc-800 accent-s8ul-cyan"
      />
    </div>
  );
}
