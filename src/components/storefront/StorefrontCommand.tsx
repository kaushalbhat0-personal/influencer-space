"use client";

import { useEffect, useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

interface NavItem {
  id: string;
  label: string;
  href: string;
  type: "page" | "anchor" | "external";
}

interface CommerceItem {
  id: string;
  name: string;
  type: "product" | "course" | "service";
}

interface StorefrontCommandProps {
  navigation: NavItem[];
  commerceItems?: CommerceItem[];
}

export function StorefrontCommand({ navigation, commerceItems = [] }: StorefrontCommandProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Lock scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const filteredNav = useMemo(() => {
    if (!query.trim()) return navigation;
    const q = query.toLowerCase();
    return navigation.filter((n) => n.label.toLowerCase().includes(q) || n.href.toLowerCase().includes(q));
  }, [navigation, query]);

  const filteredCommerce = useMemo(() => {
    if (!query.trim()) return commerceItems;
    const q = query.toLowerCase();
    return commerceItems.filter((c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [commerceItems, query]);

  const handleSelect = (item: NavItem) => {
    setOpen(false);
    setQuery("");
    if (item.type === "external") {
      window.open(item.href, "_blank", "noopener noreferrer");
    } else if (item.type === "anchor") {
      const id = item.href.replace("#", "");
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth" });
      else window.location.href = item.href;
    } else if (item.type === "page") {
      window.location.href = item.href;
    }
  };

  const handleCommerceSelect = (item: CommerceItem) => {
    setOpen(false);
    setQuery("");
    // Scroll to relevant section
    const sectionMap: Record<string, string> = {
      product: "products",
      course: "courses",
      service: "services",
    };
    const sectionId = sectionMap[item.type] || item.type;
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  if (!open) {
    return (
      <div className="pointer-events-none fixed right-4 top-[4.5rem] z-30 hidden md:block">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open command palette (Cmd+K)"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)]/90 px-3 py-1.5 text-xs text-[var(--text-muted,#71717A)] shadow-sm backdrop-blur-sm transition-colors hover:border-[var(--border,rgba(255,255,255,0.12))] hover:text-[var(--text-primary,#FAFAFA)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#6366F1)]"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <span className="ml-1 hidden rounded bg-[var(--surface-card-hover,#27272A)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted,#71717A)] lg:inline">⌘K</span>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        <div className="w-full max-w-lg px-4">
          <Command className="bg-[var(--surface-card,#18181B)] shadow-xl">
            <CommandInput
              placeholder="Search pages, products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <CommandList>
              {filteredNav.length === 0 && filteredCommerce.length === 0 ? (
                <CommandEmpty>No results found.</CommandEmpty>
              ) : (
                <>
                  {filteredNav.length > 0 && (
                    <CommandGroup heading="Navigation">
                      {filteredNav.map((item) => (
                        <CommandItem key={item.id} onSelect={() => handleSelect(item)}>
                          {item.label}
                          <span className="ml-auto text-[10px] text-[var(--text-muted,#71717A)]">{item.type}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {filteredCommerce.length > 0 && (
                    <CommandGroup heading="Products & Services">
                      {filteredCommerce.map((item) => (
                        <CommandItem key={item.id} onSelect={() => handleCommerceSelect(item)}>
                          {item.name}
                          <span className="ml-auto text-[10px] capitalize text-[var(--text-muted,#71717A)]">{item.type}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
          <p className="mt-2 text-center text-[10px] text-white/60">Press Esc to close • ↑↓ to navigate • Enter to select</p>
        </div>
      </div>
    </>
  );
}
