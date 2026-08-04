"use client";

import { useState } from "react";
import { searchSupport } from "@/actions/support.actions";

type Result = {
  users: Array<{ id: string; email: string; name: string | null; role: string }>;
  tenants: Array<{ id: string; name: string; subdomain: string }>;
  agencies: Array<{ id: string; name: string; subdomain: string }>;
};

export function SupportSearch() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result | null>(null);

  async function run() {
    if (!query.trim()) return;
    setBusy(true);
    const res = await searchSupport(query);
    if (res.success && res.data) setResults(res.data);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") run(); }}
          placeholder="Search users, creators, agencies…"
          className="w-full max-w-md rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
          aria-label="Support search"
          data-testid="support-search"
        />
        <button onClick={run} disabled={busy} className="rounded-md bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 disabled:opacity-50" data-testid="support-search-btn">
          {busy ? "…" : "Search"}
        </button>
      </div>

      {results && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="admin-card p-4">
            <h3 className="text-xs font-semibold text-zinc-400 mb-2">Users ({results.users.length})</h3>
            {results.users.map((u) => (
              <div key={u.id} className="border-b border-white/5 py-1.5 text-sm text-zinc-300" data-testid="support-user">
                {u.name ?? u.email} <span className="text-xs text-zinc-500">{u.email} · {u.role}</span>
              </div>
            ))}
          </div>
          <div className="admin-card p-4">
            <h3 className="text-xs font-semibold text-zinc-400 mb-2">Creators ({results.tenants.length})</h3>
            {results.tenants.map((t) => (
              <div key={t.id} className="border-b border-white/5 py-1.5 text-sm text-zinc-300" data-testid="support-tenant">
                {t.name} <span className="text-xs text-zinc-500">{t.subdomain}</span>
              </div>
            ))}
          </div>
          <div className="admin-card p-4">
            <h3 className="text-xs font-semibold text-zinc-400 mb-2">Agencies ({results.agencies.length})</h3>
            {results.agencies.map((a) => (
              <div key={a.id} className="border-b border-white/5 py-1.5 text-sm text-zinc-300" data-testid="support-agency">
                {a.name} <span className="text-xs text-zinc-500">{a.subdomain}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
