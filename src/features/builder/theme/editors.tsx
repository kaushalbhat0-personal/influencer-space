"use client";

import type { ThemeEditorProps } from "./registry";
import { themeEditorRegistry } from "./registry";

function ColorEditor({ value, onChange, editable }: ThemeEditorProps) {
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} disabled={!editable} className="h-6 w-8 cursor-pointer rounded border border-white/10 bg-transparent p-0 disabled:opacity-30" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={!editable} className="flex-1 rounded bg-zinc-950 px-2 py-1 text-[10px] font-mono text-zinc-300 outline-none ring-1 ring-white/10 focus:ring-s8ul-cyan/50 disabled:opacity-30" />
    </div>
  );
}

function TextEditor({ value, onChange, editable }: ThemeEditorProps) {
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={!editable} className="w-full rounded bg-zinc-950 px-2 py-1 text-[10px] font-mono text-zinc-300 outline-none ring-1 ring-white/10 focus:ring-s8ul-cyan/50 disabled:opacity-30" />;
}

function NumberEditor({ value, onChange, editable }: ThemeEditorProps) {
  return (
    <div className="flex items-center gap-1 rounded bg-zinc-950 px-1 py-0.5 ring-1 ring-white/10">
      <button onClick={() => onChange(String(Math.max(0, parseInt(value) - 1)))} disabled={!editable} className="px-1 text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-30">−</button>
      <input type="number" value={parseInt(value)} onChange={(e) => onChange(e.target.value)} disabled={!editable} className="w-full bg-transparent text-center text-[10px] font-mono text-zinc-300 outline-none disabled:opacity-30 [appearance:textfield]" />
      <button onClick={() => onChange(String(parseInt(value) + 1))} disabled={!editable} className="px-1 text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-30">+</button>
    </div>
  );
}

function ShadowEditor({ value, onChange, editable }: ThemeEditorProps) {
  return <TextEditor value={value} onChange={onChange} editable={editable} tokenKey="" resolvedValue="" />;
}

function BorderEditor({ value, onChange, editable }: ThemeEditorProps) {
  return <TextEditor value={value} onChange={onChange} editable={editable} tokenKey="" resolvedValue="" />;
}

function OpacityEditor({ value, onChange, editable }: ThemeEditorProps) {
  return <NumberEditor value={value} onChange={onChange} editable={editable} tokenKey="" resolvedValue="" />;
}

themeEditorRegistry.register("color", ColorEditor, "Color");
themeEditorRegistry.register("typography", TextEditor, "Typography");
themeEditorRegistry.register("spacing", NumberEditor, "Spacing");
themeEditorRegistry.register("radius", NumberEditor, "Radius");
themeEditorRegistry.register("shadow", ShadowEditor, "Shadow");
themeEditorRegistry.register("border", BorderEditor, "Border");
themeEditorRegistry.register("opacity", OpacityEditor, "Opacity");
themeEditorRegistry.register("motion", TextEditor, "Motion");
themeEditorRegistry.register("breakpoint", TextEditor, "Breakpoint");
themeEditorRegistry.register("zIndex", NumberEditor, "Z-Index");
themeEditorRegistry.register("custom", TextEditor, "Custom");
