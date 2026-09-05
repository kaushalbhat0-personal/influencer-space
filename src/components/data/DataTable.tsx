"use client";

import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  pageSize = 20,
  searchable = false,
  searchPlaceholder = "Search...",
  onRowClick,
  emptyMessage = "No data found.",
  loading = false,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = (row as Record<string, unknown>)[col.key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = (a as Record<string, unknown>)[sortKey];
      const bv = (b as Record<string, unknown>)[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (loading) {
    return (
      <div className={cn("platform-card-secondary overflow-hidden", className)}>
        <div className="px-[var(--admin-card-px)] py-[var(--admin-card-py)] space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn("overflow-hidden", className)}>
        <EmptyState
          variant="contextual"
          title={emptyMessage}
          description="Get started by adding your first item — your content will appear here."
        />
      </div>
    );
  }

  return (
    <div className={cn("platform-card-secondary overflow-hidden", className)}>
      {searchable && (
        <div className="border-b border-white/10 px-[var(--admin-table-th-px)] py-[var(--admin-table-toolbar-py)]">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={searchPlaceholder}
            className="admin-input text-sm py-2"
            aria-label="Search"
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="admin-table" role="grid">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "select-none",
                    col.sortable && "cursor-pointer hover:text-[var(--text-primary)]",
                    col.className
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                  aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)
                        : <ChevronsUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-8 text-center px-[var(--admin-table-td-px)]">
                  <p className="text-xs text-[var(--text-muted)]">
                    {search ? `No results match “${search}”. Try a different search or clear the filter.` : emptyMessage}
                  </p>
                  {search && (
                    <button
                      onClick={() => { setSearch(""); setPage(1); }}
                      className="btn-ghost mt-3 text-xs"
                    >
                      Clear filter
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={i}
                  className={cn(onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(row)}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(e) => { if (e.key === "Enter" && onRowClick) onRowClick(row); }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 px-[var(--admin-table-th-px)] py-[var(--admin-table-toolbar-py)]">
          <p className="text-xs text-[var(--text-muted)]">
            Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-[var(--text-secondary)] px-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
