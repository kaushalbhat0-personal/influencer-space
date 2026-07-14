"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TIMELINE_ROUTE } from "@/lib/constants";
import { deleteTimelineEvent } from "@/actions/timeline.actions";
import type { TimelineEventData } from "@/services/timeline.service";

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export function TimelineList({ events }: { events: TimelineEventData[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this timeline event?")) return;
    const result = await deleteTimelineEvent(id);
    if (result.success) router.refresh();
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
    >
      <div className="overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Title</th>
              <th className="hidden sm:table-cell">Stats</th>
              <th className="hidden sm:table-cell">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                  No timeline events yet.{" "}
                  <Link href={`${TIMELINE_ROUTE}/new`} className="font-semibold text-s8ul-cyan hover:underline">
                    Add your first event
                  </Link>
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <motion.tr key={event.id} variants={rowVariants} className="group">
                  <td>
                    <span className="admin-badge-cyan font-gaming">{event.year}</span>
                  </td>
                  <td className="font-medium text-white">{event.title}</td>
                  <td className="hidden sm:table-cell">
                    {event.stats ? (
                      <span className="admin-badge-gold">{event.stats}</span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className={event.isActive ? "admin-badge-active" : "admin-badge-inactive"}>
                      {event.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <Link href={`${TIMELINE_ROUTE}/${event.id}/edit`} className="admin-btn-outline px-3 py-1.5 text-xs">
                        Edit
                      </Link>
                      <button onClick={() => handleDelete(event.id)} className="admin-btn-danger px-3 py-1.5 text-xs">
                        Delete
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
