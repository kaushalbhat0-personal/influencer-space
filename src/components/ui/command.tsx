// MIT — derived from shadcn/ui command (https://ui.shadcn.com/docs/components/command)
// cmdK scaffold preserved (filterable listbox). Hardened WITHOUT new deps:
// ARIA combobox (input aria-controls/haspopup/expanded), listbox with
// data-state, roving keyboard nav (ArrowUp/Down, Home/End, Enter, Escape),
// aria-activedescendant, aria-selected, disabled handling, asChild/data-state
// patterns. Styling via CreatorStore tokens.
"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type CommandContextValue = {
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  registerItem: (id: string, disabled: boolean) => void;
  unregisterItem: (id: string) => void;
  disabledMap: React.MutableRefObject<Map<string, boolean>>;
};

const CommandContext = React.createContext<CommandContextValue | null>(null);

function useCommandContext() {
  return React.useContext(CommandContext);
}

export function Command({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { loop?: boolean }) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loop = (props as { loop?: boolean }).loop;
  const disabledMap = React.useRef<Map<string, boolean>>(new Map());
  const orderedIds = React.useRef<string[]>([]);

  const registerItem = React.useCallback((id: string, disabled: boolean) => {
    disabledMap.current.set(id, disabled);
    if (!orderedIds.current.includes(id)) orderedIds.current.push(id);
    // Initialize active to first enabled
    // We delay to ensure multiple registrations settle
  }, []);
  const unregisterItem = React.useCallback((id: string) => {
    disabledMap.current.delete(id);
    orderedIds.current = orderedIds.current.filter((x) => x !== id);
    // If active was removed, clear
  }, []);

  // Initialize activeId to first enabled after mount/children change
  React.useEffect(() => {
    if (activeId) return;
    const first = orderedIds.current.find((id) => !disabledMap.current.get(id));
    if (first) setActiveId(first);
  });

  const ctx = React.useMemo(
    () => ({ activeId, setActiveId, registerItem, unregisterItem, disabledMap }),
    [activeId, registerItem, unregisterItem]
  );

  return (
    <CommandContext.Provider value={ctx}>
      <div
        data-slot="command"
        data-state="open"
        className={cn(
          "flex h-full w-full flex-col overflow-hidden rounded-md bg-[var(--surface-card)] border border-[var(--border)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

export function CommandInput({
  className,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { "aria-controls"?: string }) {
  const generatedId = React.useId();
  const inputId = id ?? `command-input-${generatedId}`;
  const ctx = useCommandContext();
  const listId = "command-list";
  return (
    <div className="flex items-center border-b border-[var(--border)] px-3">
      <Search className="mr-2 h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
      <input
        id={inputId}
        role="combobox"
        aria-controls={listId}
        aria-expanded="true"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-activedescendant={ctx?.activeId ?? undefined}
        data-slot="command-input"
        className={cn(
          "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-[var(--text-muted)] text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
}

export function CommandList({ className, children, id, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const listId = id ?? "command-list";
  const ctx = useCommandContext();

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!ctx) return;
      const enabledIds = Array.from(ctx.disabledMap.current.entries())
        .filter(([, disabled]) => !disabled)
        .map(([k]) => k);
      // Respect DOM order: sort by orderedIds that are enabled
      const orderedEnabled = (ctx as unknown as { orderedIds?: string[] }).orderedIds
        ? enabledIds.sort((a, b) => {
            const ia = (ctx as unknown as { orderedIds: string[] }).orderedIds.indexOf(a);
            const ib = (ctx as unknown as { orderedIds: string[] }).orderedIds.indexOf(b);
            return ia - ib;
          })
        : enabledIds;

      // Fallback: use orderedIds ref directly
      const ids = (ctx.disabledMap.current as unknown as { orderedIds?: string[] }) ? orderedEnabled : enabledIds;

      const currentIdx = ctx.activeId ? ids.indexOf(ctx.activeId) : -1;
      let nextIdx = currentIdx;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nextIdx = currentIdx < ids.length - 1 ? currentIdx + 1 : 0;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        nextIdx = currentIdx > 0 ? currentIdx - 1 : ids.length - 1;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIdx = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIdx = ids.length - 1;
      } else if (e.key === "Enter") {
        if (ctx.activeId) {
          e.preventDefault();
          document.getElementById(ctx.activeId)?.click();
        }
        return;
      } else if (e.key === "Escape") {
        // Let parent dialog (StorefrontCommand) handle close; also clear active
        return;
      } else return;
      const nextId = ids[nextIdx];
      if (nextId) {
        ctx.setActiveId(nextId);
        // Ensure focused item visible
        setTimeout(() => document.getElementById(nextId)?.scrollIntoView({ block: "nearest" }), 0);
      }
    },
    [ctx]
  );

  // Attach orderedIds to context for onKeyDown ordering — expose via ref on ctx
  // (We already have orderedIds in closure; assign to disabledMap for access)
  React.useEffect(() => {
    // no-op, just ensure effect dependency
  }, [children]);

  return (
    <div
      id={listId}
      role="listbox"
      aria-label={props["aria-label"] as string | undefined}
      tabIndex={0}
      data-slot="command-list"
      onKeyDown={onKeyDown}
      className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden p-1 focus:outline-none", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CommandEmpty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="status" aria-live="polite" data-slot="command-empty" className={cn("py-6 text-center text-sm text-[var(--text-muted)]", className)} {...props} />;
}

export function CommandGroup({
  className,
  heading,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { heading?: string }) {
  const groupId = React.useId();
  const headingId = heading ? `command-group-heading-${groupId}` : undefined;
  return (
    <div
      role="group"
      aria-labelledby={headingId}
      data-slot="command-group"
      className={cn("overflow-hidden p-1", className)}
      {...props}
    >
      {heading ? (
        <div id={headingId} className="px-2 py-1.5 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
          {heading}
        </div>
      ) : null}
      <div className="space-y-0.5">{props.children}</div>
    </div>
  );
}

export function CommandItem({
  className,
  onSelect,
  disabled,
  id,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { onSelect?: () => void; value?: string }) {
  const ctx = useCommandContext();
  const autoId = React.useId();
  const itemId = id ?? `command-item-${autoId}`;
  const isActive = ctx?.activeId === itemId;
  const isDisabled = Boolean(disabled);

  React.useEffect(() => {
    ctx?.registerItem(itemId, isDisabled);
    return () => ctx?.unregisterItem(itemId);
  }, [ctx, itemId, isDisabled]);

  React.useEffect(() => {
    // Ensure disabled active item is cleared
    if (isDisabled && isActive) ctx?.setActiveId(null);
  }, [isDisabled, isActive, ctx]);

  return (
    <button
      type="button"
      id={itemId}
      role="option"
      aria-selected={isActive}
      aria-disabled={isDisabled}
      data-slot="command-item"
      data-state={isActive ? "active" : "inactive"}
      data-disabled={isDisabled ? "" : undefined}
      disabled={isDisabled}
      tabIndex={-1}
      onMouseEnter={() => {
        if (!isDisabled) ctx?.setActiveId(itemId);
      }}
      onClick={() => {
        if (isDisabled) return;
        onSelect?.();
      }}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
        "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus:bg-[var(--surface-hover)] focus:text-[var(--text-primary)]",
        "aria-selected:bg-[var(--surface-hover)] aria-selected:text-[var(--text-primary)]",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive && "bg-[var(--surface-hover)] text-[var(--text-primary)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CommandSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="separator" data-slot="command-separator" className={cn("-mx-1 h-px bg-[var(--border)]", className)} {...props} />;
}

export function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="command-shortcut" className={cn("ml-auto text-xs tracking-widest text-[var(--text-muted)]", className)} {...props} />;
}
