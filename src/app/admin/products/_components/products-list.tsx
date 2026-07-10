"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { PRODUCTS_ROUTE } from "@/lib/constants";
import { ProductActions } from "./product-actions";
import type { ProductData } from "@/services/product.service";

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

export function ProductsList({ products }: { products: ProductData[] }) {
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
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6 sm:py-3">
                Price
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
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-12 text-center text-sm text-gray-500 sm:px-6"
                >
                  No products yet.{" "}
                  <Link
                    href={`${PRODUCTS_ROUTE}/new`}
                    className="font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    Add your first product
                  </Link>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <motion.tr
                  key={product.id}
                  variants={rowVariants}
                  className="hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 sm:px-6">
                    {product.name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700 sm:px-6">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-4 text-sm sm:table-cell sm:px-6">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        product.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right text-sm sm:px-6">
                    <ProductActions product={product} />
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
