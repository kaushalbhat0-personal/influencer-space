"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface Props {
  pct: number;
  large?: boolean;
}

export function CompletionBadge({ pct, large }: Props) {
  const color = pct >= 80 ? "text-emerald-400 border-emerald-500/30" : pct >= 50 ? "text-amber-400 border-amber-500/30" : "text-zinc-500 border-zinc-700";

  return (
    <Link
      href="/admin/dashboard"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium hover:opacity-80 transition-opacity shrink-0",
        large ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]",
        color,
      )}
      title="View Dashboard"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-zinc-600")} />
      {large ? "Website " : ""}{pct}% Complete
    </Link>
  );
}
