"use client";

import React, { useState } from "react";
import { useWorkspace } from "@/modules/workspace/presentation/context";
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
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors"
      >
        <Icon className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
        <span className="truncate max-w-[120px]">{workspace.name || workspace.slug}</span>
        <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-64 rounded-xl border border-white/10 bg-zinc-900 py-2 shadow-[var(--shadow-overlay)]">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { switchWorkspace(ws.id); setOpen(false); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors"
              >
                {ws.type === "AGENCY" ? <Building2 className="h-4 w-4 text-[var(--brand-primary)]" /> : <User className="h-4 w-4 text-[var(--brand-primary)]" />}
                <span className="flex-1 text-left truncate">{ws.name || ws.slug}</span>
                {ws.id === workspace.id && <Check className="h-4 w-4 text-[var(--brand-primary)]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
