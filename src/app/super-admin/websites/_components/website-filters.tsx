"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

interface Props {
  totalCount: number;
  stateCounts: Record<string, number>;
  currentQuery: string;
  currentStatus: string;
}

export function WebsiteFilters({ totalCount, stateCounts, currentQuery, currentStatus }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(currentQuery);

  function applyFilters(status?: string) {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status && status !== "all") params.set("status", status);
    router.push(`/super-admin/websites?${params.toString()}`);
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search by creator, domain, or theme..."
            className="w-full rounded-lg border border-white/10 bg-zinc-900 pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-s8ul-cyan"
          />
        </div>
        <button onClick={() => applyFilters()} className="rounded-lg bg-s8ul-cyan px-4 py-2 text-xs font-semibold text-black hover:opacity-90 transition-opacity">
          Search
        </button>

        <div className="flex gap-1.5">
          {["all", "live", "draft", "preview"].map((s) => {
            const count = s === "all" ? totalCount : (stateCounts[s] ?? 0);
            const active = s === "all" ? !currentStatus : currentStatus === s;
            return (
              <button
                key={s}
                onClick={() => applyFilters(s === "all" ? undefined : s)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-s8ul-cyan/10 text-s8ul-cyan border border-s8ul-cyan/30" : "text-zinc-500 border border-white/10 hover:text-zinc-300"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1 text-zinc-600">({count})</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
