"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getMyNotifications, getMyUnreadCount, markAllRead, markRead } from "@/actions/communication.actions";
import { Bell } from "lucide-react";

/** RCCF-TRACK-02 Phase 6 — runtime-backed notification bell. */
export function RuntimeNotificationBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Awaited<ReturnType<typeof getMyNotifications>>["items"]>([]);

  const load = useCallback(async () => {
    const [u, list] = await Promise.all([getMyUnreadCount(), getMyNotifications({})]);
    setUnread(u);
    if (list.ok) setItems(list.items ?? []);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  const openAndRead = async () => {
    setOpen(!open);
    if (!open) { for (const n of items ?? []) { if (!n.read) await markRead(n.id).catch(() => {}); } }
    await load();
  };

  return (
    <div className="relative">
      <button onClick={openAndRead} aria-label={`Notifications${unread > 0 ? `: ${unread} unread` : ""}`} className="relative rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors">
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-40 w-80 rounded-xl border border-white/10 bg-[var(--surface-overlay)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <div className="flex items-center gap-3">
                {unread > 0 && <button onClick={async () => { await markAllRead(); load(); }} className="text-xs text-s8ul-cyan hover:underline">Mark all read</button>}
                <Link href="/admin/notifications" onClick={() => setOpen(false)} className="text-xs text-zinc-400 hover:text-white">View all →</Link>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(items ?? []).length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-zinc-500">
                  <Bell className="h-6 w-6 mx-auto mb-2 text-zinc-600" /> No notifications yet
                </div>
              ) : (
                (items ?? []).slice(0, 12).map((n) => (
                  <div key={n.id} className="flex flex-col gap-1 px-4 py-3 text-left border-b border-white/5">
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-s8ul-cyan" />}
                      <div>
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        {n.body && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-600">{n.category}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
