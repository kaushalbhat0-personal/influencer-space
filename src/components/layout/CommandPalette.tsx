"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MotionPresence, MotionDiv } from "@/components/ui/MotionSafe";
import { Search, ArrowRight } from "lucide-react";

export interface CommandItem {
  id: string;
  label: string;
  category: "page" | "action" | "product" | "order" | "customer";
  href?: string;
  onSelect?: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  items?: CommandItem[];
  className?: string;
}

const DEFAULT_ITEMS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", category: "page", href: "/admin/dashboard", keywords: ["home", "overview"] },
  { id: "products", label: "Products", category: "page", href: "/admin/products", keywords: ["store", "items"] },
  { id: "orders", label: "Orders", category: "page", href: "/admin/orders", keywords: ["purchases", "sales"] },
  { id: "customers", label: "Customers", category: "page", href: "/admin/customers", keywords: ["fans", "users"] },
  { id: "gallery", label: "Gallery", category: "page", href: "/admin/gallery", keywords: ["media", "images"] },
  { id: "settings", label: "Settings", category: "page", href: "/admin/settings", keywords: ["config", "preferences"] },
  { id: "builder", label: "Builder", category: "page", href: "/builder", keywords: ["edit", "design", "page"] },
  { id: "analytics", label: "Analytics", category: "page", href: "/admin/analytics", keywords: ["stats", "data"] },
  { id: "ai", label: "AI Assistant", category: "page", href: "/admin/ai-assistant", keywords: ["chat", "help"] },
  { id: "billing", label: "Billing", category: "page", href: "/admin/billing", keywords: ["plan", "payment"] },
];

export function CommandPalette({ items = DEFAULT_ITEMS, className }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const filtered = query
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.keywords?.some((k) => k.toLowerCase().includes(query.toLowerCase()))
      )
    : items.slice(0, 6);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      setQuery("");
      if (item.href) router.push(item.href);
      if (item.onSelect) item.onSelect();
    },
    [router]
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!open) return null;

  return (
    <MotionPresence>
      <MotionDiv
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      >
        <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
        <MotionDiv
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "relative z-10 w-full max-w-lg rounded-xl border border-white/10 bg-[var(--surface-overlay)] shadow-2xl overflow-hidden",
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <Search className="h-4 w-4 text-zinc-500" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages, products, orders..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex((i) => Math.max(i - 1, 0));
                }
                if (e.key === "Enter" && filtered[selectedIndex]) {
                  handleSelect(filtered[selectedIndex]!);
                }
              }}
              role="combobox"
              aria-expanded
              aria-controls="command-list"
            />
            <kbd className="hidden sm:inline-flex items-center rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
              ESC
            </kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-2" id="command-list" role="listbox">
            {filtered.length === 0 && (
              <p className="p-4 text-sm text-zinc-500 text-center">No results found.</p>
            )}
            {filtered.map((item, i) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors text-left",
                  i === selectedIndex ? "bg-s8ul-cyan/10 text-s8ul-cyan" : "text-zinc-300 hover:bg-white/5"
                )}
                role="option"
                aria-selected={i === selectedIndex}
              >
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase rounded px-1.5 py-0.5 flex-shrink-0",
                    item.category === "page" && "bg-blue-500/20 text-blue-400",
                    item.category === "action" && "bg-s8ul-cyan/20 text-s8ul-cyan"
                  )}
                >
                  {item.category}
                </span>
                <span className="flex-1">{item.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-600" aria-hidden="true" />
              </button>
            ))}
          </div>
        </MotionDiv>
      </MotionDiv>
    </MotionPresence>
  );
}
