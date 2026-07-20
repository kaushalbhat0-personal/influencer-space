"use client";

import { useRef, useEffect } from "react";
import { useInlineEdit } from "../inline-edit";
import { inspectorState } from "@/lib/builder/properties";

export function InlineEditorOverlay() {
  const inlineEdit = useInlineEdit();
  const { state, updateValue, commitEdit, cancelEdit, goNext, goPrev } = inlineEdit;
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (state.active) {
      setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); textareaRef.current?.focus(); }, 50);
    }
  }, [state.active, state.mode]);

  useEffect(() => {
    if (!state.active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
      if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
      if (e.key === "Tab") { e.preventDefault(); if (e.shiftKey) goPrev(); else goNext(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.active, commitEdit, cancelEdit, goNext, goPrev]);

  if (!state.active) return null;

  const readonly = inspectorState.state.readOnly;
  const barStyle: React.CSSProperties = { position: "fixed", left: state.x, top: state.y - 40, minWidth: Math.max(state.width, 200), maxWidth: Math.max(state.width, 400), zIndex: 200, padding: "4px 8px", background: "rgba(15,15,19,0.98)", border: "2px solid rgba(0,245,255,0.6)", borderRadius: "6px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" };

  const btnSave = <button onClick={commitEdit} className="rounded bg-s8ul-cyan/20 px-2 py-0.5 text-[9px] text-s8ul-cyan hover:bg-s8ul-cyan/30">Save</button>;
  const btnCancel = <button onClick={cancelEdit} className="rounded bg-zinc-800 px-2 py-0.5 text-[9px] text-zinc-400 hover:bg-zinc-700">Cancel</button>;

  if (state.mode === "image") {
    return (
      <div style={barStyle} className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">Image URL</span>
          <div className="flex gap-1">{btnSave}{btnCancel}</div>
        </div>
        <input ref={inputRef} type="url" value={String(state.value ?? "")} onChange={(e) => updateValue(e.target.value)} disabled={readonly} className="w-full rounded bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none ring-1 ring-white/10 focus:ring-s8ul-cyan/50 disabled:opacity-50" placeholder="https://example.com/image.jpg" />
      </div>
    );
  }

  if (state.mode === "url") {
    return (
      <div style={barStyle} className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">{state.descriptor?.label ?? "URL"}</span>
          <div className="flex gap-1">{btnSave}{btnCancel}</div>
        </div>
        <input ref={inputRef} type="url" value={String(state.value ?? "")} onChange={(e) => updateValue(e.target.value)} disabled={readonly} className="w-full rounded bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none ring-1 ring-white/10 focus:ring-s8ul-cyan/50 disabled:opacity-50" placeholder="https://" />
      </div>
    );
  }

  return (
    <div style={barStyle} className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">{state.descriptor?.label ?? "Text"}</span>
        <div className="flex gap-1">{btnSave}{btnCancel}</div>
      </div>
      <input ref={inputRef} type="text" value={String(state.value ?? "")} onChange={(e) => updateValue(e.target.value)} disabled={readonly} className="w-full rounded bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none ring-1 ring-white/10 focus:ring-s8ul-cyan/50 disabled:opacity-50" placeholder="Enter text..." />
    </div>
  );
}
