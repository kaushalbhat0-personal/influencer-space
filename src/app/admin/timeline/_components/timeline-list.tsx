"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TIMELINE_ROUTE } from "@/lib/constants";
import { deleteTimelineEvent } from "@/actions/timeline.actions";
import type { TimelineEventData } from "@/services/timeline.service";

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

export function TimelineList({ events }: { events: TimelineEventData[] }) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this timeline event?")) return;
    const result = await deleteTimelineEvent(id);
    if (result.success) router.refresh();
  }

  return (
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
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">Year</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">Title</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6 sm:py-3">Stats</th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6 sm:py-3">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500 sm:px-6">
                  No timeline events yet.{" "}
                  <Link href={`${TIMELINE_ROUTE}/new`} className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Add your first event
                  </Link>
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <motion.tr key={event.id} variants={rowVariants} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4 font-gaming text-sm font-bold text-indigo-600 sm:px-6">{event.year}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 sm:px-6">{event.title}</td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-sm text-gray-700 sm:table-cell sm:px-6">
                    {event.stats ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{event.stats}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-sm sm:table-cell sm:px-6">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${event.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {event.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-sm sm:px-6">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`${TIMELINE_ROUTE}/${event.id}/edit`} className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100">Edit</Link>
                      <button onClick={() => handleDelete(event.id)} className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100">Delete</button>
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
