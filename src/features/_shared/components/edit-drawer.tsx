"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface EditDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  isSaving?: boolean;
}

export function EditDrawer({ open, onClose, title, children, isSaving }: EditDrawerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-zinc-950 border-l border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <div className="flex items-center gap-2">
            {isSaving && <LoadingSpinner size="sm" />}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
