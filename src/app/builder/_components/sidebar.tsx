"use client";

import { useState } from "react";
import { Layers, Image, Palette, Search, Package, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { registryFacade } from "@/lib/registry/facade";

type Tab = "modules" | "pages" | "layers" | "assets" | "theme";

export function BuilderSidebar({ onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("modules");
  const [search, setSearch] = useState("");

  const modules = registryFacade.module.list();
  const filtered = modules.filter((m) => m.definition.identity.name.toLowerCase().includes(search.toLowerCase()));

  const tabs: { id: Tab; label: string; icon: typeof Layers }[] = [
    { id: "modules", label: "Modules", icon: Package },
    { id: "pages", label: "Pages", icon: FileText },
    { id: "layers", label: "Layers", icon: Layers },
    { id: "assets", label: "Assets", icon: Image },
    { id: "theme", label: "Theme", icon: Palette },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Builder</span>
        <button onClick={onToggle} className="rounded p-0.5 text-zinc-600 hover:text-zinc-400">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className="flex border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn("flex-1 py-2 text-[10px] font-medium transition-colors", activeTab === tab.id ? "border-b border-s8ul-cyan text-s8ul-cyan" : "text-zinc-600 hover:text-zinc-400")}
          >
            <tab.icon className="mx-auto mb-0.5 h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "modules" && (
        <>
          <div className="border-b border-white/5 px-2 py-1.5">
            <div className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-2 py-1">
              <Search className="h-3 w-3 text-zinc-600" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search modules..." className="flex-1 bg-transparent text-xs text-zinc-400 outline-none placeholder:text-zinc-700" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filtered.map((m) => (
              <div key={m.definition.identity.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200">
                <Package className="h-3.5 w-3.5 text-zinc-600" />
                <span className="truncate">{m.definition.identity.name}</span>
              </div>
            ))}
            {filtered.length === 0 && <p className="px-2 py-4 text-center text-xs text-zinc-700">No modules found</p>}
          </div>
        </>
      )}

      {activeTab !== "modules" && (
        <div className="flex flex-1 items-center justify-center text-xs text-zinc-700">
          {activeTab === "pages" && "Pages panel — coming soon"}
          {activeTab === "layers" && "Layers panel — coming soon"}
          {activeTab === "assets" && "Assets panel — coming soon"}
          {activeTab === "theme" && "Theme panel — coming soon"}
        </div>
      )}
    </div>
  );
}
