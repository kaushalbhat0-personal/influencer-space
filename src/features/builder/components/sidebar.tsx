"use client";

import { useState, memo } from "react";
import { Search, Package } from "lucide-react";
import { componentRegistry } from "@/lib/registry/components";

export const BuilderSidebar = memo(function BuilderSidebar({ onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [search, setSearch] = useState("");

  const categories = componentRegistry.getCategories();
  const filteredCategories = search
    ? categories
        .map((cat) => ({
          ...cat,
          components: cat.components.filter((c) =>
            c.name.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((cat) => cat.components.length > 0)
    : categories;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sections</span>
        <button onClick={onToggle} className="rounded p-0.5 text-zinc-600 hover:text-zinc-400">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className="border-b border-white/5 px-2 py-1.5">
        <div className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-2 py-1">
          <Search className="h-3 w-3 text-zinc-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sections..." className="flex-1 bg-transparent text-xs text-zinc-400 outline-none placeholder:text-zinc-700" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {filteredCategories.map(({ category, components }) => (
          <div key={category}>
            <p className="px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{category}</p>
            <div className="space-y-0.5">
              {components.map((comp) => (
                <div key={comp.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200">
                  <Package className="h-3.5 w-3.5 text-zinc-600" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{comp.name}</p>
                    <p className="truncate text-[10px] text-zinc-600">{comp.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && <p className="px-2 py-4 text-center text-xs text-zinc-700">No sections found</p>}
      </div>
    </div>
  );
});
