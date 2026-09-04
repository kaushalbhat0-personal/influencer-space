"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

interface StorefrontSearchProps {
  placeholder?: string;
  paramName?: string;
  onSearch?: (query: string) => void;
}

export function StorefrontSearch({ placeholder = "Search...", paramName = "q", onSearch }: StorefrontSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get(paramName) || "";
  const [query, setQuery] = useState(initialQuery);

  // Sync from URL when it changes externally (e.g., browser back)
  useEffect(() => {
    const urlQuery = searchParams.get(paramName) || "";
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateUrl = useCallback(
    (newQuery: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newQuery) {
        params.set(paramName, newQuery);
      } else {
        params.delete(paramName);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
      onSearch?.(newQuery);
    },
    [router, pathname, searchParams, paramName, onSearch]
  );

  // Debounced URL update
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentUrlQuery = searchParams.get(paramName) || "";
      if (query !== currentUrlQuery) {
        updateUrl(query);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchParams, paramName, updateUrl]);

  const handleClear = () => {
    setQuery("");
    updateUrl("");
  };

  return (
    <div className="relative mx-auto mb-6 max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted,#71717A)]" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-10 w-full rounded-full border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] py-2 pl-10 pr-10 text-sm text-[var(--text-primary,#FAFAFA)] placeholder:text-[var(--text-muted,#71717A)] focus:border-[var(--brand-primary,#6366F1)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary,#6366F1)]/20"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-[var(--text-muted,#71717A)] hover:bg-[var(--surface-card-hover,#27272A)] hover:text-[var(--text-primary,#FAFAFA)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary,#6366F1)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function useFilteredItems<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  keys: (keyof T)[]
): T[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase().trim();
  return items.filter((item) =>
    keys.some((k) => {
      const v = item[k];
      if (typeof v === "string") return v.toLowerCase().includes(q);
      if (typeof v === "number") return String(v).includes(q);
      return false;
    })
  );
}
