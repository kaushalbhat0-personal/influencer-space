"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { MotionDiv, MotionPresence } from "@/components/ui/MotionSafe";

/**
 * RCCF-68.3.3 — mobile overlay panel for the Builder's Sections / Properties
 * rails. Below `lg` the fixed side panels would steal the canvas width, so they
 * are hidden and their content is rendered here as a bottom-sheet overlay.
 *
 * Accessibility: dialog role, aria-modal, Escape to close, focus moves into the
 * panel on open and returns to the trigger on close, body scroll is locked while
 * open, backdrop click closes.
 *
 * Canvas is never covered permanently — the panel is dismissed to edit.
 */
export function BuilderMobilePanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);

  // Escape closes + focus management + body scroll lock + Tab trap (reuse AdminSidebar pattern).
  useEffect(() => {
    if (!open) return;

    openRef.current = true;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the panel so keyboard users land on the content.
    const focusTimer = window.setTimeout(() => {
      closeRef.current?.focus();
    }, 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const sheet = sheetRef.current;
        if (!sheet) return;
        const focusables = Array.from(
          sheet.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (focusables.length === 0) return;
        const first = focusables[0] as HTMLElement;
        const last = focusables[focusables.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      openRef.current = false;
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      // Return focus to whatever opened the panel.
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <MotionPresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="builder-mobile-panel" data-panel-title={title}>
          {/* Backdrop — blocks interaction with the canvas behind the sheet. */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Bottom sheet */}
          <MotionDiv
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="absolute inset-x-0 bottom-0 max-h-[60vh] sm:max-h-[70vh] max-h-[60dvh] overflow-hidden rounded-t-[var(--radius-card-elevated)] border-t border-white/10 bg-zinc-950 shadow-[var(--shadow-overlay)]"
          >
            <div ref={sheetRef} className="flex flex-col h-full">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:p-4">
                <h2 className="text-sm font-semibold text-white">{title}</h2>
                <button
                  ref={closeRef}
                  onClick={onClose}
                  aria-label={`Close ${title}`}
                  className="rounded-[var(--radius-control)] p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 max-h-[55vh] sm:max-h-[65vh] overflow-y-auto overscroll-contain p-4 sm:p-4 pb-[env(safe-area-inset-bottom)]">
                {children}
              </div>
            </div>
          </MotionDiv>
        </div>
      )}
    </MotionPresence>
  );
}
