"use client";

import { useRouter } from "next/navigation";
import { markMessageAsRead, deleteMessage } from "@/actions/contact.actions";

export function MessageActions({ messageId, isRead }: { messageId: string; isRead: boolean }) {
  const router = useRouter();

  async function handleMarkRead() {
    const result = await markMessageAsRead(messageId);
    if (result.success) router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this message?")) return;
    const result = await deleteMessage(messageId);
    if (result.success) router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {!isRead && (
        <button onClick={handleMarkRead} className="admin-btn-cyan px-3 py-1.5 text-xs">
          Mark Read
        </button>
      )}
      <button onClick={handleDelete} className="admin-btn-danger px-3 py-1.5 text-xs">
        Delete
      </button>
    </div>
  );
}
