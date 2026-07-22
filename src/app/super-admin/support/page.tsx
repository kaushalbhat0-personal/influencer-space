"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Search, User, Building, CreditCard, ShoppingBag,
  Clock, Copy, ExternalLink, Key, Shield, Ban,
  Loader2,
} from "lucide-react";

type SupportResult = {
  type: "user" | "tenant" | "agency" | "order";
  id: string;
  label: string;
  sublabel: string;
  href: string;
  status?: string;
} | null;

export default function SupportPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SupportResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch { setResults([]); } finally { setLoading(false); }
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Support Console</h1>
        <p className="mt-1 text-sm text-zinc-400">Search by email, creator name, tenant, domain, or order ID.</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by email, name, tenant, subdomain, or order ID..."
            className="admin-input pl-10 py-2.5 text-sm"
            autoFocus
          />
        </div>
        <button onClick={handleSearch} disabled={loading} className="btn-primary px-6 text-sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="admin-card divide-y divide-white/[0.04]">
          {results.map((r) => (
            <a
              key={r?.id}
              href={r?.href}
              target={r?.type === "order" ? "_self" : "_blank"}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
            >
              <div className={cn("flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center",
                r?.type === "user" ? "bg-indigo-500/10 text-indigo-400" :
                r?.type === "tenant" ? "bg-emerald-500/10 text-emerald-400" :
                r?.type === "agency" ? "bg-violet-500/10 text-violet-400" :
                "bg-amber-500/10 text-amber-400"
              )}>
                {r?.type === "user" ? <User className="h-4 w-4" /> :
                 r?.type === "tenant" ? <Building className="h-4 w-4" /> :
                 r?.type === "agency" ? <Shield className="h-4 w-4" /> :
                 <ShoppingBag className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{r?.label}</p>
                <p className="text-xs text-zinc-500 truncate">{r?.sublabel}</p>
              </div>
              <span className="text-[10px] font-medium uppercase text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5">{r?.type}</span>
              <ExternalLink className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
            </a>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && query && results.length === 0 && (
        <div className="admin-card p-8 text-center">
          <Search className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No results found for &quot;{query}&quot;</p>
          <p className="text-xs text-zinc-700 mt-1">Try searching by email, creator name, tenant, or subdomain.</p>
        </div>
      )}

      {/* Quick Actions Panel */}
      <div className="admin-card p-5">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Key className="h-4 w-4 text-amber-400" /> Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: "Impersonate", desc: "Login as creator", icon: User, href: "#", color: "text-indigo-400 bg-indigo-500/10" },
            { label: "Reset Password", desc: "Force password reset", icon: Key, href: "#", color: "text-amber-400 bg-amber-500/10" },
            { label: "Copy Dashboard", desc: "Copy admin URL", icon: Copy, href: "#", color: "text-zinc-400 bg-zinc-800" },
            { label: "View Tenant", desc: "Tenant detail", icon: Building, href: "/super-admin/tenants", color: "text-emerald-400 bg-emerald-500/10" },
            { label: "View Orders", desc: "All orders", icon: ShoppingBag, href: "/super-admin/payments", color: "text-amber-400 bg-amber-500/10" },
            { label: "View Billing", desc: "Subscription", icon: CreditCard, href: "/super-admin/subscriptions", color: "text-violet-400 bg-violet-500/10" },
            { label: "View Audit", desc: "Audit log", icon: Clock, href: "/super-admin/audit", color: "text-zinc-400 bg-zinc-800" },
            { label: "Suspend", desc: "Disable account", icon: Ban, href: "#", color: "text-red-400 bg-red-500/10" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex flex-col gap-1 rounded-xl border border-white/[0.06] p-3 hover:border-white/[0.12] transition-all text-left"
            >
              <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", action.color)}>
                <action.icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs font-medium text-white">{action.label}</span>
              <span className="text-[10px] text-zinc-600">{action.desc}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
