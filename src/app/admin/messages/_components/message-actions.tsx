"use client";

import { useRouter } from "next/navigation";
import { markMessageAsRead, deleteMessage } from "@/actions/contact.actions";

export function MessageActions({ messageId, isRead }: { messageId: string; isRead: boolean }) {
  const router = useRouter();

  async function handleMarkRead() {
    const result = await markMessageAsRead(messageId);
    if (result.success) {
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this message?")) return;
    const result = await deleteMessage(messageId);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {!isRead && (
        <button
          onClick={handleMarkRead}
          className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          Mark Read
        </button>
      )}
      <button
        onClick={handleDelete}
        className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        Delete
      </button>
    </div>
  );
}
