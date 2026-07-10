"use client";

import { signOut } from "next-auth/react";
import { GlassCard } from "@/components/ui/GlassCard";

interface DashboardClientProps {
  productCount: number;
  activeProductCount: number;
  affiliateCount: number;
  totalClicks: number;
}

export function DashboardClient({
  productCount,
  activeProductCount,
  affiliateCount,
  totalClicks,
}: DashboardClientProps) {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400">
            Welcome to your CreatorBrand admin
          </p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full rounded-lg bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/30 sm:w-auto"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GlassCard className="p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-400">Total Products</h3>
          <p className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            {productCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {activeProductCount} active
          </p>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-400">
            Active Products
          </h3>
          <p className="mt-2 text-3xl font-bold text-green-400 sm:text-4xl">
            {activeProductCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            out of {productCount} total
          </p>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-400">
            Affiliate Links
          </h3>
          <p className="mt-2 text-3xl font-bold text-amber-400 sm:text-4xl">
            {affiliateCount}
          </p>
        </GlassCard>

        <GlassCard className="p-4 sm:p-6">
          <h3 className="text-sm font-medium text-gray-400">
            Total Affiliate Clicks
          </h3>
          <p className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            {totalClicks}
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
