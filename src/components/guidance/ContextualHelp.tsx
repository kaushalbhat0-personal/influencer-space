"use client";
import { useState } from "react";

export function ContextualHelp({ text, label = "Learn more" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[11px] text-zinc-400 hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        i
      </button>
      {open && <span className="ml-2 max-w-[28ch] text-xs leading-relaxed text-zinc-300">{text}</span>}
    </span>
  );
}

export function HelperText({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-zinc-400">{children}</p>;
}
