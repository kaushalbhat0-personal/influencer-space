"use client";

import { useState, useCallback } from "react";
import { Search, Filter } from "lucide-react";

interface EventRow {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  payloadPreview: string;
  aggregateId: string | null;
}

export function EventsClient({ initialEvents, eventTypes }: { initialEvents: EventRow[]; eventTypes: string[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [typeFilter, setTypeFilter] = useState("");
  const [searchAggregate, setSearchAggregate] = useState("");
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const m = await import("@/actions/operations.actions");
      const result = await m.getEvents({ type: typeFilter || undefined, aggregateId: searchAggregate || undefined, limit: 100 });
      setEvents(result);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchAggregate]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Event Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            className="admin-input text-sm py-2 pr-8">
            <option value="">All Types</option>
            {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Aggregate ID</label>
          <input type="text" value={searchAggregate} onChange={(e) => setSearchAggregate(e.target.value)}
            placeholder="tenantId / workspaceId / partnerId"
            className="admin-input text-sm py-2 w-64" />
        </div>
        <button onClick={search} disabled={loading}
          className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
          <Search className="h-3.5 w-3.5" /> {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Event Table */}
      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Aggregate</th>
                <th>Source</th>
                <th>Timestamp</th>
                <th>Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">
                      {ev.type}
                    </span>
                  </td>
                  <td><span className="text-xs font-mono text-zinc-400">{ev.aggregateId ?? "—"}</span></td>
                  <td><span className="text-xs text-zinc-500">{ev.source}</span></td>
                  <td><span className="text-xs text-zinc-500">{new Date(ev.timestamp).toLocaleString("en-IN")}</span></td>
                  <td><code className="text-[10px] text-zinc-600 font-mono">{ev.payloadPreview}{ev.payloadPreview.length >= 200 ? "..." : ""}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {events.length === 0 && (
        <div className="admin-card p-8 text-center">
          <Filter className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-500">No events match your filter.</p>
        </div>
      )}
    </div>
  );
}
