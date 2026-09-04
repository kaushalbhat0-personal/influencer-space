// MIT — derived from shadcn/ui sheet (https://ui.shadcn.com/docs/components/sheet)
// Pattern: Radix Dialog + Tailwind drawer. Reimplemented WITHOUT Radix dep
// but with Radix-equivalent semantics: Portal, data-state, focus-trap,
// focus-restore, Escape, overlay click, aria-labelledby/describedby, body scroll lock.
// Honors prefers-reduced-motion (globals.css collapses transition-duration).
"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string | null;
  descriptionId: string | null;
  setTitleId: (id: string | null) => void;
  setDescriptionId: (id: string | null) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const ctx = React.useContext(SheetContext);
  if (!ctx) throw new Error("Sheet components must be used within <Sheet>");
  return ctx;
}

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export function Sheet({
  open,
  onOpenChange,
  defaultOpen = false,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isControlled = open !== undefined;
  const currentOpen = isControlled ? (open as boolean) : internalOpen;
  const [titleId, setTitleId] = React.useState<string | null>(null);
  const [descriptionId, setDescriptionId] = React.useState<string | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  // Close on Escape (Radix-equivalent: dialog handles Escape at window level)
  React.useEffect(() => {
    if (!currentOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentOpen, setOpen]);

  // Lock body scroll when open (no inert for simplicity, but hide background from AT via aria-hidden on sheet)
  React.useEffect(() => {
    if (!currentOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [currentOpen]);

  const value = React.useMemo(
    () => ({
      open: currentOpen,
      setOpen,
      titleId,
      descriptionId,
      setTitleId,
      setDescriptionId,
      triggerRef,
    }),
    [currentOpen, setOpen, titleId, descriptionId]
  );

  return (
    <SheetContext.Provider value={value}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  asChild,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { setOpen, triggerRef } = useSheetContext();

  const handleClick = React.useCallback(() => setOpen(true), [setOpen]);

  const setTriggerRef = React.useCallback(
    (el: HTMLElement | null) => {
      triggerRef.current = el;
      // Preserve forwarded ref if caller passed one via props.ref — handled by cloneElement path
    },
    [triggerRef]
  );

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void; ref?: React.Ref<HTMLElement> }>;
    return React.cloneElement(child, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref: (el: HTMLElement | null) => {
        setTriggerRef(el);
        const origRef = (child as unknown as { ref?: React.Ref<HTMLElement> }).ref;
        if (typeof origRef === "function") origRef(el);
        else if (origRef && typeof origRef === "object" && "current" in origRef) (origRef as React.MutableRefObject<HTMLElement | null>).current = el;
      },
      onClick: (e: React.MouseEvent) => {
        // Preserve child original onClick
        (child.props as { onClick?: (e: React.MouseEvent) => void }).onClick?.(e);
        if (!e.defaultPrevented) handleClick();
      },
    } as unknown as Partial<React.ReactElement>);
  }

  return (
    <button
      type="button"
      ref={setTriggerRef as React.Ref<HTMLButtonElement>}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}

export function SheetOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = useSheetContext();
  if (!open) return null;
  const overlay = (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      data-state={open ? "open" : "closed"}
      onClick={() => setOpen(false)}
      aria-hidden="true"
      {...props}
    />
  );
  if (typeof document === "undefined") return overlay;
  return ReactDOM.createPortal(overlay, document.body);
}

export function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { side?: SheetSide }) {
  const { open, setOpen, titleId, descriptionId, triggerRef } = useSheetContext();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  // Focus trap + restore (Radix Dialog equivalent)
  useIsomorphicLayoutEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = triggerRef.current ?? (document.activeElement as HTMLElement);
    // Focus first focusable inside content
    const frame = requestAnimationFrame(() => {
      if (!contentRef.current) return;
      const focusable = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      if (first) first.focus();
      else contentRef.current.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  React.useEffect(() => {
    if (open) return;
    // Restore focus to trigger on close
    const prev = previouslyFocusedRef.current;
    if (prev && typeof prev.focus === "function") {
      // Defer to allow portal unmount
      setTimeout(() => prev.focus(), 0);
    }
  }, [open]);

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Tab" || !contentRef.current) return;
      const focusable = Array.from(
        contentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    []
  );

  if (!open) return null;

  const sideClasses: Record<SheetSide, string> = {
    top: "inset-x-0 top-0 border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
    right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
    bottom: "inset-x-0 bottom-0 border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
    left: "inset-y-0 left-0 h-full w-3/4 border-l sm:max-w-sm data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  };

  const content = (
    <>
      <SheetOverlay />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId ?? undefined}
        aria-describedby={descriptionId ?? undefined}
        data-state={open ? "open" : "closed"}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-[var(--surface-card)] p-6 shadow-[var(--shadow-overlay)] transition ease-in-out border-[var(--border)]",
          "duration-300 focus:outline-none",
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );

  if (typeof document === "undefined") return content;
  return ReactDOM.createPortal(content, document.body);
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />;
}

export function SheetTitle({ className, id, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { setTitleId } = useSheetContext();
  const autoId = React.useId();
  const resolvedId = id ?? `sheet-title-${autoId}`;
  React.useEffect(() => {
    setTitleId(resolvedId);
    return () => setTitleId(null);
  }, [resolvedId, setTitleId]);
  return <h3 id={resolvedId} className={cn("text-lg font-semibold text-[var(--text-primary)]", className)} {...props} />;
}

export function SheetDescription({ className, id, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { setDescriptionId } = useSheetContext();
  const autoId = React.useId();
  const resolvedId = id ?? `sheet-desc-${autoId}`;
  React.useEffect(() => {
    setDescriptionId(resolvedId);
    return () => setDescriptionId(null);
  }, [resolvedId, setDescriptionId]);
  return <p id={resolvedId} className={cn("text-sm text-[var(--text-muted)]", className)} {...props} />;
}
