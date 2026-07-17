"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EditEntityDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function EditEntityDrawer({ open, onClose, title, children }: EditEntityDrawerProps) {
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
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

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-zinc-950 shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/95 px-6 py-4 backdrop-blur-sm">
              <h2 className="text-base font-semibold text-white">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
