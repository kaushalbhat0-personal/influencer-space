"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { PRODUCTS_ROUTE } from "@/lib/constants";
import { ProductActions } from "./product-actions";
import type { ProductData } from "@/services/product.service";

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0 },
};

export function ProductsList({ products }: { products: ProductData[] }) {
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
              <th>Product</th>
              <th className="hidden sm:table-cell">Price</th>
              <th className="hidden sm:table-cell">Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-500">
                  No products yet.{" "}
                  <Link href={`${PRODUCTS_ROUTE}/new`} className="font-semibold text-s8ul-cyan hover:underline">
                    Add your first product
                  </Link>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <motion.tr key={product.id} variants={rowVariants} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      {product.imageUrl && (
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-white/10">
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <span className="font-medium text-white">{product.name}</span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className="font-mono text-gray-300">{formatCurrency(product.price)}</span>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className={product.isActive ? "admin-badge-active" : "admin-badge-inactive"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                      <ProductActions product={product} />
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
