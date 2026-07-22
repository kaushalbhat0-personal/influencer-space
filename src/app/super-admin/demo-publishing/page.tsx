"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getAllPublications, transitionPublication, validatePublication, getAllowedTransitions } from "@/lib/demo/publication";
import type { PublicationStatus } from "@/lib/demo/publication";
import { CheckCircle2, XCircle, Eye, Check, Star, Archive, ArrowRight, RefreshCw, ExternalLink } from "lucide-react";

const STATUS_COLORS: Record<PublicationStatus, string> = {
  draft:     "bg-zinc-800 text-zinc-400",
  review:    "bg-amber-500/15 text-amber-400",
  approved:  "bg-indigo-500/15 text-indigo-400",
  published: "bg-emerald-500/15 text-emerald-400",
  featured:  "bg-violet-500/15 text-violet-400",
  archived:  "bg-zinc-800 text-zinc-500",
};

export default function DemoPublishingPage() {
  const [pubs, setPubs] = useState(() => getAllPublications());
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = useCallback(() => setPubs(getAllPublications()), []);

  const handleAction = useCallback((seedId: string, action: PublicationStatus) => {
    const result = transitionPublication(seedId, action);
    if (result.success) refresh();
    else alert(result.error);
  }, [refresh]);

  const filtered = pubs.filter((p) => filter === "all" || p.status === filter);
  const counts = {
    all: pubs.length,
    draft: pubs.filter((p) => p.status === "draft").length,
    review: pubs.filter((p) => p.status === "review").length,
    published: pubs.filter((p) => p.status === "published" || p.status === "featured").length,
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Publishing</h1>
        <p className="mt-1 text-sm text-zinc-400">Review, approve and publish creator websites.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { id: "all", label: "All", count: counts.all },
          { id: "draft", label: "Drafts", count: counts.draft },
          { id: "review", label: "In Review", count: counts.review },
          { id: "published", label: "Published", count: counts.published },
        ].map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-all",
              filter === f.id ? "bg-indigo-500 text-white" : "bg-white/[0.04] text-zinc-400 hover:text-zinc-200")}>
            {f.label} <span className="ml-1 text-xs opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Publication Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Industry</th>
                <th>Status</th>
                <th>Validation</th>
                <th>Storefront</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pub) => {
                const validation = expanded === pub.seedId ? validatePublication(pub.seedId) : null;
                const transitions = getAllowedTransitions(pub.status);
                return (
                  <tr key={pub.seedId}>
                    <td>
                      <span className="text-white text-sm font-medium">{pub.industry}</span>
                      <p className="text-xs text-zinc-600">{pub.seedId}</p>
                    </td>
                    <td>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[pub.status])}>
                        {pub.status}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => setExpanded(expanded === pub.seedId ? null : pub.seedId)}
                        className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Check
                      </button>
                      {validation && (
                        <div className="mt-2 space-y-1">
                          {validation.checks.map((c) => (
                            <div key={c.label} className="flex items-center gap-1.5 text-xs">
                              {c.passed ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <XCircle className="h-3 w-3 text-red-400" />}
                              <span className={c.passed ? "text-zinc-400" : "text-red-400"}>{c.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {pub.storefrontUrl ? (
                        <a href={`https://${pub.storefrontUrl}`} target="_blank" rel="noopener" className="text-indigo-400 hover:underline text-xs font-mono flex items-center gap-1">
                          {pub.storefrontUrl} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : <span className="text-zinc-600 text-xs">—</span>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {transitions.map((t) => (
                          <button key={t} onClick={() => handleAction(pub.seedId, t)}
                            className={cn("rounded px-2 py-1 text-[10px] font-medium transition-all",
                              t === "review" ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" :
                              t === "approved" ? "bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25" :
                              t === "published" ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" :
                              t === "featured" ? "bg-violet-500/15 text-violet-400 hover:bg-violet-500/25" :
                              t === "archived" ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" :
                              "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}
                            title={`Move to ${t}`}>
                            {t === "review" ? <Eye className="h-3 w-3 inline mr-0.5" /> :
                             t === "approved" ? <Check className="h-3 w-3 inline mr-0.5" /> :
                             t === "published" ? <ArrowRight className="h-3 w-3 inline mr-0.5" /> :
                             t === "featured" ? <Star className="h-3 w-3 inline mr-0.5" /> :
                             t === "archived" ? <Archive className="h-3 w-3 inline mr-0.5" /> :
                             <RefreshCw className="h-3 w-3 inline mr-0.5" />}
                            {t}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="admin-card p-8 text-center mt-4">
          <p className="text-sm text-zinc-500">No demos match this filter.</p>
        </div>
      )}
    </div>
  );
}
