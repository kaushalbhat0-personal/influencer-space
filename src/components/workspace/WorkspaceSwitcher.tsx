"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/lib/workspace/context";
import { Building2, User, ChevronDown, Check } from "lucide-react";

export function WorkspaceSwitcher() {
  const { workspace, workspaces, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  if (!workspace) return null;

  const Icon = workspace.type === "AGENCY" ? Building2 : User;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
      >
        <Icon className="h-4 w-4 shrink-0 text-s8ul-cyan" />
        <span className="truncate max-w-[120px]">{workspace.name || workspace.slug}</span>
        <ChevronDown className="h-3 w-3 text-zinc-500" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl border border-white/10 bg-zinc-900 py-2 shadow-2xl">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { switchWorkspace(ws.id); setOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                {ws.type === "AGENCY" ? <Building2 className="h-4 w-4 text-s8ul-cyan" /> : <User className="h-4 w-4 text-s8ul-cyan" />}
                <span className="flex-1 text-left truncate">{ws.name || ws.slug}</span>
                {ws.id === workspace.id && <Check className="h-4 w-4 text-s8ul-cyan" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
