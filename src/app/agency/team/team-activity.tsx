"use client";

import { useState, useTransition } from "react";
import { getTeamAuditAction } from "@/actions/team.actions";
import { History } from "lucide-react";

interface AuditItem {
  id: string;
  type: string;
  timestamp: string;
  actorName: string | null;
  actorEmail: string | null;
  targetEmail: string | null;
  description: string;
  previousRole: string | null;
  newRole: string | null;
}

export function TeamActivity({ initialItems, initialCursor }: { initialItems: AuditItem[]; initialCursor: string | null }) {
  const [items, setItems] = useState<AuditItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadMore = () => {
    if (!cursor) return;
    startTransition(async () => {
      const res = await getTeamAuditAction({ cursor });
      if (res.success) {
        setItems((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor);
        setError(null);
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-white">
        <History className="h-4 w-4 text-[var(--text-muted)]" />
        Team Activity
      </h3>
      <p className="mb-3 text-xs text-[var(--text-muted)]">Invitations, role changes and removals.</p>

      {error && <p className="mb-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-400">{error}</p>}

      {items.length === 0 && !error ? (
        <p className="py-4 text-center text-sm text-[var(--text-muted)]">No team activity yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="text-[var(--text-primary)]">{item.description}</span>
              <span className="shrink-0 text-xs text-[var(--text-muted)]">
                {new Date(item.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <button
          onClick={loadMore}
          disabled={pending}
          className="mt-3 w-full rounded-md border border-white/10 px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-zinc-800 disabled:opacity-40"
        >
          {pending ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
