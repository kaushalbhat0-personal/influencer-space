"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatCurrency } from "@/lib/utils";
import type { ProductData } from "@/services/product.service";

interface ProductGridProps {
  products: ProductData[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center text-white/60">
        <p className="text-xl">No merchandise available yet.</p>
        <p className="text-sm">Check back soon for exclusive drops!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08, duration: 0.5 }}
        >
          <GlassCard className="flex h-full flex-col overflow-hidden">
            {product.imageUrl && (
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-white/5">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            )}
            <div className="mt-4 flex flex-1 flex-col">
              <h3 className="text-base font-semibold text-white sm:text-lg">
                {product.name}
              </h3>
              {product.description && (
                <p className="mt-1 line-clamp-2 text-sm text-white/60">
                  {product.description}
                </p>
              )}
              <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-lg font-bold text-amber-400 sm:text-xl">
                  {formatCurrency(product.price)}
                </span>
                <Link
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Checkout integration coming soon!");
                  }}
                  className="w-full rounded-full bg-amber-500/20 px-4 py-2 text-center text-sm font-medium text-amber-300 backdrop-blur-sm transition-colors hover:bg-amber-500/30 sm:w-auto"
                >
                  Buy Now →
                </Link>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
