"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AFFILIATES_ROUTE } from "@/lib/constants";
import { AffiliateActions } from "./affiliate-actions";
import type { AffiliateData } from "@/services/affiliate.service";

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

export function AffiliatesList({
  affiliates,
}: {
  affiliates: AffiliateData[];
}) {
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
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">
                Title
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6 sm:py-3">
                URL
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">
                Clicks
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:table-cell sm:px-6 sm:py-3">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {affiliates.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-12 text-center text-sm text-gray-500 sm:px-6"
                >
                  No affiliate links yet.{" "}
                  <Link
                    href={`${AFFILIATES_ROUTE}/new`}
                    className="font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    Add your first affiliate link
                  </Link>
                </td>
              </tr>
            ) : (
              affiliates.map((affiliate) => (
                <motion.tr
                  key={affiliate.id}
                  variants={rowVariants}
                  className="hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 sm:px-6">
                    <div className="flex items-center gap-3">
                      {affiliate.imageUrl && (
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                          <img
                            src={affiliate.imageUrl}
                            alt={affiliate.title}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <span>{affiliate.title}</span>
                    </div>
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-4 text-sm text-gray-500 sm:table-cell sm:px-6">
                    <a
                      href={affiliate.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-500 hover:underline"
                    >
                      {affiliate.url}
                    </a>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900 sm:px-6">
                    {affiliate.clicks}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-sm sm:table-cell sm:px-6">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        affiliate.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {affiliate.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-sm sm:px-6">
                    <AffiliateActions affiliate={affiliate} />
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
