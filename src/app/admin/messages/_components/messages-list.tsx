"use client";

import { motion } from "framer-motion";
import { MessageActions } from "./message-actions";
import type { ContactData } from "@/services/contact.service";

const tableVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

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
          <h1 className="text-2xl font-bold text-white">Messages</h1>
          <p className="text-sm text-gray-400">
            Contact form submissions
          </p>
        </div>
        {unreadCount > 0 && (
          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-400">
            {unreadCount} unread
          </span>
        )}
      </div>

      <motion.div
        variants={tableVariants}
        initial="hidden"
        animate="show"
        className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">
                  Name
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6 sm:py-3">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">
                  Message
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6 sm:py-3">
                  Status
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:table-cell sm:px-6 sm:py-3">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {messages.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-gray-500 sm:px-6"
                  >
                    No messages yet.
                  </td>
                </tr>
              ) : (
                messages.map((message) => (
                  <motion.tr
                    key={message.id}
                    variants={rowVariants}
                    className={`hover:bg-gray-50 ${!message.isRead ? "bg-blue-50/50" : ""}`}
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 sm:px-6">
                      {message.name}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                      {message.email}
                    </td>
                    <td className="max-w-xs truncate px-4 py-4 text-sm text-gray-500 sm:px-6">
                      <span className="line-clamp-2">{message.message}</span>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-sm sm:table-cell sm:px-6">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          message.isRead
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {message.isRead ? "Read" : "Unread"}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-gray-500 lg:table-cell sm:px-6">
                      {formatDate(message.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm sm:px-6">
                      <MessageActions
                        messageId={message.id}
                        isRead={message.isRead}
                      />
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
