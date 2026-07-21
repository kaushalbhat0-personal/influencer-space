"use client";

import { cn } from "@/lib/utils";
import { MotionDiv, MotionPresence } from "@/components/ui/MotionSafe";
import { Bell } from "lucide-react";
import { useState } from "react";

export interface Notification {
  id: string;
  title: string;
  description: string;
  read: boolean;
  createdAt: string;
  action?: { label: string; href: string };
}

interface NotificationCenterProps {
  notifications?: Notification[];
  className?: string;
}

export function NotificationCenter({ notifications = [], className }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `: ${unreadCount} unread` : ""}`}
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <MotionPresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-40 w-80 rounded-xl border border-white/10 bg-[var(--surface-overlay)] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-s8ul-cyan hover:underline">
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-zinc-500">
                    <Bell className="h-6 w-6 mx-auto mb-2 text-zinc-600" />
                    No notifications yet
                  </div>
                ) : (
                  items.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      className={cn(
                        "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-white/5 border-b border-white/5",
                        !n.read && "bg-s8ul-cyan/5"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-s8ul-cyan" />}
                        <div>
                          <p className="text-sm font-medium text-white">{n.title}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{n.description}</p>
                        </div>
                      </div>
                      {n.action && (
                        <a href={n.action.href} className="text-xs text-s8ul-cyan mt-1 hover:underline">
                          {n.action.label} →
                        </a>
                      )}
                    </button>
                  ))
                )}
              </div>
            </MotionDiv>
          </>
        )}
      </MotionPresence>
    </div>
  );
}
