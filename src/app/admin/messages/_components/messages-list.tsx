"use client";

import { motion } from "framer-motion";
import { MessageActions } from "./message-actions";
import type { ContactData } from "@/services/contact.service";

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

function formatDate(date: Date): string {
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
          <h1 className="admin-gradient-text text-2xl font-bold font-gaming">Messages</h1>
          <p className="mt-1 text-sm text-gray-400">Contact form submissions</p>
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
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                    No messages yet.
                  </td>
                </tr>
              ) : (
                messages.map((message) => (
                  <motion.tr
                    key={message.id}
                    variants={rowVariants}
                    className={`group ${!message.isRead ? "bg-s8ul-cyan/[0.02]" : ""}`}
                  >
                    <td className="font-medium text-white">{message.name}</td>
                    <td className="hidden sm:table-cell">
                      <span className="text-gray-400">{message.email}</span>
                    </td>
                    <td>
                      <span className="line-clamp-2 text-sm text-gray-400">{message.message}</span>
                    </td>
                    <td className="hidden sm:table-cell">
                      <span className={message.isRead ? "admin-badge-inactive" : "admin-badge-cyan"}>
                        {message.isRead ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td className="hidden text-gray-400 lg:table-cell">
                      {formatDate(message.createdAt)}
                    </td>
                    <td>
                      <div className="opacity-0 transition-opacity group-hover:opacity-100">
                        <MessageActions messageId={message.id} isRead={message.isRead} />
                      </div>
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
