"use client";

import { motion } from "framer-motion";
import { MessageActions } from "./message-actions";
import type { ContactData } from "@/actions/contact.types";

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function MessagesList({ messages }: { messages: ContactData[] }) {
  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-[var(--text-primary)] text-2xl font-bold font-display">Messages</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Contact form submissions</p>
        </div>
        {unreadCount > 0 && (
          <span className="admin-badge-cyan">{unreadCount} unread</span>
        )}
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
      >
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden sm:table-cell">Email</th>
                <th>Message</th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="hidden lg:table-cell">Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
                    No messages yet.
                  </td>
                </tr>
              ) : (
                messages.map((message) => (
                  <motion.tr
                    key={message.id}
                    variants={rowVariants}
                    className={`group ${!message.isRead ? "bg-[var(--brand-primary)]/[0.02]" : ""}`}
                  >
                    <td className="font-medium text-white">{message.name}</td>
                    <td className="hidden sm:table-cell">
                      <span className="break-all text-[var(--text-muted)]">{message.email}</span>
                    </td>
                    <td className="max-w-[12rem] sm:max-w-none">
                      <span className="line-clamp-2 break-words text-sm text-[var(--text-muted)]">{message.message}</span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className={message.isRead ? "admin-badge-inactive" : "admin-badge-cyan"}>
                        {message.isRead ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td className="hidden text-[var(--text-muted)] lg:table-cell">
                      {formatDate(message.createdAt)}
                    </td>
                    <td>
                      <MessageActions messageId={message.id} isRead={message.isRead} />
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
