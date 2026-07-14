"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AFFILIATES_ROUTE } from "@/lib/constants";
import { AffiliateActions } from "./affiliate-actions";
import type { AffiliateData } from "@/services/affiliate.service";

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export function AffiliatesList({ affiliates }: { affiliates: AffiliateData[] }) {
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
              <th>Title</th>
              <th className="hidden sm:table-cell">URL</th>
              <th>Clicks</th>
              <th className="hidden sm:table-cell">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {affiliates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">
                  No affiliate links yet.{" "}
                  <Link href={`${AFFILIATES_ROUTE}/new`} className="font-semibold text-s8ul-cyan hover:underline">
                    Add your first affiliate link
                  </Link>
                </td>
              </tr>
            ) : (
              affiliates.map((affiliate) => (
                <motion.tr key={affiliate.id} variants={rowVariants} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      {affiliate.imageUrl && (
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
                          <img src={affiliate.imageUrl} alt={affiliate.title} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <span className="font-medium text-white">{affiliate.title}</span>
                    </div>
                  </td>
                  <td className="hidden max-w-[200px] truncate sm:table-cell">
                    <a
                      href={affiliate.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-s8ul-cyan/70 hover:text-s8ul-cyan hover:underline"
                    >
                      {affiliate.url}
                    </a>
                  </td>
                  <td>
                    <span className="admin-badge-cyan">{affiliate.clicks}</span>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className={affiliate.isActive ? "admin-badge-active" : "admin-badge-inactive"}>
                      {affiliate.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                      <AffiliateActions affiliate={affiliate} />
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
