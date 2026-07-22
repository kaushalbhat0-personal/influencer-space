"use client";

import { useState } from "react";
import { DEMO_SEEDS } from "@/lib/demo/seeds";
import { cn } from "@/lib/utils";
import { Search, Sparkles, Clock } from "lucide-react";

export default function DemoLibraryPage() {
  const [query, setQuery] = useState("");

  const filtered = DEMO_SEEDS.filter((s) => {
    if (query && !s.industry.toLowerCase().includes(query.toLowerCase()) && !s.persona.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Demo Library</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage reusable industry presets and demo seeds.</p>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by industry or persona..." className="admin-input pl-10 py-2 text-sm" />
        </div>
        <a href="/super-admin/demo-studio" className="btn-primary px-5 py-2 text-sm flex items-center gap-2 flex-shrink-0">
          <Sparkles className="h-4 w-4" /> Generate Demo
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((seed) => (
          <div key={seed.id} className="admin-card p-5 group hover:border-indigo-500/20 transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{seed.industry}</h3>
                <p className="text-xs text-zinc-500">{seed.persona} · {seed.audience}</p>
              </div>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                "bg-zinc-800 text-zinc-400")}>
                <Clock className="h-3 w-3 inline mr-1" /> v{seed.id.includes("v2") ? "2.0" : "1.0"}
              </span>
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="h-3 w-3 rounded" style={{ backgroundColor: seed.brand.palette.primary }} />
                <span className="h-3 w-3 rounded" style={{ backgroundColor: seed.brand.palette.secondary }} />
                {seed.brand.name}
              </div>
              <p className="text-xs text-zinc-600 line-clamp-2">{seed.content.bio}</p>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600">{seed.products.length} products · {seed.testimonials.length} testimonials</span>
              <span className="text-zinc-700">Seed v1.0</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="admin-card p-8 text-center">
          <Search className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No seeds match your filter.</p>
        </div>
      )}
    </div>
  );
}
