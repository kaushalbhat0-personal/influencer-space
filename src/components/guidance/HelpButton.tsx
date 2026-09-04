"use client";
import { useState } from "react";
import { HelpPanel } from "./HelpPanel";
import { Button } from "@/components/ui/Button";

export function HelpButton({ context }: { context?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Help"
        className="fixed bottom-6 right-6 z-40 inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-4 text-sm font-medium text-white shadow-[var(--shadow-card)] hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <span aria-hidden>?</span> Help
      </button>
      <HelpPanel open={open} onClose={() => setOpen(false)} context={context} />
    </>
  );
}
