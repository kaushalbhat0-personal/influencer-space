"use client";

import { useState, useMemo } from "react";
import { Search, AlertTriangle, ChevronDown, ChevronRight, Palette, Type, Space, Box, EyeOff, Layers } from "lucide-react";
import { themeQuery } from "@/lib/builder/theme/query";
import { themeDiagnostics } from "@/lib/builder/theme/diagnostics";
import { themeRegistry } from "@/lib/builder/theme/registry";
import { themeEditorRegistry } from "./registry";
import { themeTransaction } from "@/lib/builder/theme/transaction";

const CATEGORY_ICONS: Record<string, typeof Palette> = {
  color: Palette, typography: Type, spacing: Space, radius: Box,
  shadow: EyeOff, border: Layers, opacity: EyeOff, motion: EyeOff,
  breakpoint: Layers, zIndex: Layers, custom: Layers,
};

export function ThemeInspector() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["color", "typography"]));
  const [, forceUpdate] = useState(0);
  const txState = themeTransaction.state;

  const handleBegin = () => { themeTransaction.begin(); forceUpdate((n) => n + 1); };
  const handleCommit = () => { themeTransaction.commit(); forceUpdate((n) => n + 1); };
  const handleRollback = () => { themeTransaction.rollback(); forceUpdate((n) => n + 1); };

  const diag = useMemo(() => themeDiagnostics.run(), []);
  const groups = themeQuery.listGroups();
  const resolved = themeQuery.getResolved();

  const filtered = groups.filter((g) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return g.label.toLowerCase().includes(s) || g.tokens.some((t) => t.key.toLowerCase().includes(s) || t.value.toLowerCase().includes(s));
  });

  const toggle = (id: string) => { const s = new Set(expanded); if (s.has(id)) s.delete(id); else s.add(id); setExpanded(s); };

  const handleChange = (key: string, value: string) => {
    themeRegistry.setTokenValue(key, value);
    forceUpdate((n) => n + 1);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <Palette className="h-3.5 w-3.5 text-zinc-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Theme</span>
        <span className="ml-auto text-[9px] text-zinc-700">{diag.totalTokens} tokens</span>
      </div>

      <div className="border-b border-white/5 px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-2 py-1">
          <Search className="h-3 w-3 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tokens..." className="flex-1 bg-transparent text-xs text-zinc-400 outline-none placeholder:text-zinc-700" />
        </div>
      </div>

      {txState.active && (
        <div className="flex items-center gap-1 border-b border-amber-500/20 bg-amber-500/5 px-2 py-1">
          <span className="text-[9px] text-amber-400">{txState.affectedCount} change{txState.affectedCount !== 1 ? "s" : ""}</span>
          <div className="ml-auto flex gap-1">
            <button onClick={handleCommit} disabled={txState.affectedCount === 0} className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30">Commit</button>
            <button onClick={handleRollback} className="rounded bg-red-500/20 px-2 py-0.5 text-[9px] text-red-400 hover:bg-red-500/30">Cancel</button>
          </div>
        </div>
      )}
      {!txState.active && (
        <div className="border-b border-white/5 px-2 py-0.5">
          <button onClick={handleBegin} className="w-full rounded px-2 py-1 text-[9px] text-zinc-600 hover:bg-zinc-900 hover:text-zinc-400 transition-colors">
            Begin Editing Session
          </button>
        </div>
      )}

      {diag.invalidReferences.length > 0 && (
        <div className="border-b border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {diag.invalidReferences.length} invalid reference{diag.invalidReferences.length > 1 ? "s" : ""}
          </div>
        </div>
      )}

      {diag.duplicateTokens.length > 0 && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-3 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-red-400">
            <AlertTriangle className="h-3 w-3" />
            {diag.duplicateTokens.length} duplicate token{diag.duplicateTokens.length > 1 ? "s" : ""}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map((group) => {
          const Icon = CATEGORY_ICONS[group.category] ?? Layers;
          const isExpanded = expanded.has(group.id);
          return (
            <div key={group.id} className="rounded-lg border border-white/5 bg-zinc-900/50 overflow-hidden">
              <button onClick={() => toggle(group.id)} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-zinc-900/80 transition-colors">
                {isExpanded ? <ChevronDown className="h-3 w-3 text-zinc-600" /> : <ChevronRight className="h-3 w-3 text-zinc-600" />}
                <Icon className="h-3 w-3 text-zinc-600" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{group.label}</span>
                <span className="ml-auto text-[9px] text-zinc-700">{group.tokens.length}</span>
              </button>
              {isExpanded && (
                <div className="px-3 pb-2 space-y-1">
                  {group.tokens.map((token) => {
                    const editor = themeEditorRegistry.get(token.category);
                    const resolvedVal = resolved[token.key] ?? token.value;
                    const isRef = token.value.startsWith("{") && token.value.endsWith("}");
                    const isEditable = token.editable;

                    return (
                      <div key={token.key} className="py-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="truncate text-[10px] text-zinc-400">{token.key.split(".").pop()}</span>
                            {token.deprecated && <span className="text-[8px] text-amber-500">dep</span>}
                            {token.source === "system" && <span className="text-[8px] text-zinc-700">sys</span>}
                          </div>
                          {isRef && (
                            <span className="text-[8px] text-zinc-600 font-mono">{token.value}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex-1">
                            {editor ? (
                              <editor.component tokenKey={token.key} value={token.value} resolvedValue={resolvedVal} editable={isEditable} onChange={(v) => handleChange(token.key, v)} />
                            ) : (
                              <span className="text-[10px] text-zinc-500">{token.value}</span>
                            )}
                          </div>
                        </div>
                        {isRef && (
                          <div className="text-[8px] text-zinc-600 truncate">
                            ↳ resolved: {resolvedVal}
                          </div>
                        )}
                        {token.description && (
                          <div className="text-[8px] text-zinc-700 truncate">{token.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Palette className="h-6 w-6 text-zinc-800" />
            <p className="text-xs text-zinc-600">No tokens match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
