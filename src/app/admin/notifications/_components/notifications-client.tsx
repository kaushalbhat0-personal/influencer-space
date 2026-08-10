"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyNotifications, markAllRead, archiveOne, deleteOne, getMyNotificationPreferences, saveNotificationPreference } from "@/actions/communication.actions";
import { Check, Archive, Trash2, RefreshCw, Bell } from "lucide-react";

type Item = NonNullable<Awaited<ReturnType<typeof getMyNotifications>>["items"]>;

/** RCCF-TRACK-02 Phase 6/7 — full notification center + preferences. */
export function NotificationsClient() {
  const [items, setItems] = useState<Item>([]);
  const [unread, setUnread] = useState(0);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<string[]>([]);

  const load = useCallback(async (cat = category, q = search) => {
    const r = await getMyNotifications({ category: cat || undefined, search: q || undefined });
    if (r.ok) { setItems(r.items ?? []); setUnread(r.unread ?? 0); setCategories(r.categories ?? []); }
  }, [category, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getMyNotificationPreferences().then((r) => { if (r.ok) setPrefs(r.prefs ?? {}); }); }, []);

  const markAll = async () => { await markAllRead(); load(); };
  const archive = async (id: string) => { await archiveOne(id); load(); };
  const remove = async (id: string) => { await deleteOne(id); load(); };
  const setPref = async (cat: string, channel: string) => { await saveNotificationPreference(cat, channel); setPrefs((p) => ({ ...p, [cat]: channel })); };

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600" placeholder="Search…" value={search} onChange={(e) => { setSearch(e.target.value); load(category, e.target.value); }} />
          <select className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white" value={category} onChange={(e) => { setCategory(e.target.value); load(e.target.value, search); }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => load()} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"><RefreshCw className="h-3 w-3" /> Refresh</button>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>{unread} unread</span>
          {unread > 0 && <button onClick={markAll} className="text-s8ul-cyan hover:underline">Mark all read</button>}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center text-sm text-zinc-500">
          <Bell className="h-8 w-8 mx-auto mb-3 text-zinc-700" /> No notifications
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className={`flex items-start justify-between gap-3 rounded-xl border border-white/[0.04] px-4 py-3 ${n.read ? "bg-white/[0.01]" : "bg-s8ul-cyan/5"}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-s8ul-cyan" />}
                  <p className="text-sm font-medium text-white">{n.title}</p>
                </div>
                {n.body && <p className="mt-0.5 text-xs text-zinc-400">{n.body}</p>}
                <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">{n.category} · {new Date(n.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex flex-shrink-0 gap-1.5">
                {!n.read && <button onClick={() => archive(n.id)} title="Mark read + archive" className="rounded-md border border-white/10 p-1.5 text-zinc-400 hover:text-white"><Check className="h-3.5 w-3.5" /></button>}
                <button onClick={() => archive(n.id)} title="Archive" className="rounded-md border border-white/10 p-1.5 text-zinc-400 hover:text-white"><Archive className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(n.id)} title="Delete" className="rounded-md border border-white/10 p-1.5 text-zinc-400 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preferences */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h2 className="text-sm font-semibold text-white">Notification preferences</h2>
        <p className="mt-0.5 text-[11px] text-zinc-500">Choose how you receive each category: In-app, Email, Both, or None.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c} className="flex items-center justify-between rounded-lg border border-white/5 bg-zinc-900/40 px-3 py-2">
              <span className="text-xs capitalize text-zinc-300">{c.replace(/_/g, " ")}</span>
              <select value={prefs[c] ?? "in_app"} onChange={(e) => setPref(c, e.target.value)} className="rounded-md border border-white/10 bg-zinc-900 px-2 py-1 text-xs text-white">
                <option value="in_app">In-app</option>
                <option value="email">Email</option>
                <option value="both">Both</option>
                <option value="none">None</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
