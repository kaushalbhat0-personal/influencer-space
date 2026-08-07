"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lightbulb, Loader2 } from "lucide-react";
import { getBuilderCompletionHints } from "@/actions/knowledge.actions";
import type { BuilderHint } from "../domain/types";

const SEVERITY_STYLES: Record<BuilderHint["severity"], string> = {
  critical: "border-rose-500/20 bg-rose-500/5 text-rose-300 hover:border-rose-500/40",
  warning: "border-amber-500/20 bg-amber-500/5 text-amber-300 hover:border-amber-500/40",
  info: "border-white/10 text-zinc-400 hover:border-white/25 hover:text-white",
};

export function BuilderCompletionHints() {
  const [hints, setHints] = useState<BuilderHint[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBuilderCompletionHints().then((result) => {
      if (cancelled) return;
      if (result.success && result.data) setHints(result.data);
      else setError(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="rounded-lg border border-white/5 bg-zinc-900/50">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-2.5 py-1.5">
        <Lightbulb className="h-3 w-3 text-amber-400" />
        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Completion Hints</p>
      </div>

      <div className="space-y-2 p-2">
        {hints === null && !error && (
          <div className="flex items-center justify-center gap-2 py-3 text-[10px] text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking content…
          </div>
        )}

        {error && (
          <p className="px-1 py-2 text-[10px] text-zinc-600">Hints unavailable.</p>
        )}

        {hints?.length === 0 && (
          <p className="px-1 py-2 text-[10px] text-zinc-500">No missing content — nice work.</p>
        )}

        {hints?.map((hint) => (
          <Link
            key={hint.id}
            href={hint.href}
            className={`block rounded-lg border px-2.5 py-2 transition-colors ${SEVERITY_STYLES[hint.severity]}`}
          >
            <span className="block text-[10px] font-medium">{hint.title}</span>
            <span className="mt-0.5 block text-[10px] opacity-80 leading-snug">{hint.message}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
