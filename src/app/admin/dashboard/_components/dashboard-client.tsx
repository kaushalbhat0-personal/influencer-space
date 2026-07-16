"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PRODUCTS_ROUTE, AFFILIATES_ROUTE, GALLERY_ROUTE, GAMES_ROUTE, MILESTONES_ROUTE } from "@/lib/constants";

interface StatCardProps {
  label: string;
  value: number;
  subtext?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}

function StatCard({ label, value, subtext, icon, iconBg, iconColor }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="admin-card-hover group flex flex-col h-full p-6"
    >
      <div className="flex items-start justify-between flex-1">
        <div>
          <p className="text-sm font-medium text-gray-400">{label}</p>
          <motion.p
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="mt-2 text-4xl font-bold font-display text-white"
          >
            {value}
          </motion.p>
          {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
        </div>
        <div className={`flex-shrink-0 rounded-xl p-3 ${iconBg}`}>
          <div className={iconColor}>{icon}</div>
        </div>
      </div>
    </motion.div>
  );
}

interface DashboardClientProps {
  productCount: number;
  activeProductCount: number;
  affiliateCount: number;
  totalClicks: number;
  galleryCount: number;
  gamesCount: number;
}

export function DashboardClient({ productCount, activeProductCount, affiliateCount, totalClicks, galleryCount, gamesCount }: DashboardClientProps) {
  const stats = [
    {
      label: "Products",
      value: productCount,
      subtext: `${activeProductCount} active`,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      iconBg: "bg-gradient-to-br from-s8ul-cyan/20 to-s8ul-purple/20",
      iconColor: "text-s8ul-cyan",
    },
    {
      label: "Affiliate Links",
      value: affiliateCount,
      subtext: `${totalClicks} total clicks`,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      iconBg: "bg-gradient-to-br from-amber-500/20 to-s8ul-gold/20",
      iconColor: "text-s8ul-gold",
    },
    {
      label: "Gallery Images",
      value: galleryCount,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      iconBg: "bg-gradient-to-br from-s8ul-pink/20 to-s8ul-cyan/20",
      iconColor: "text-s8ul-pink",
    },
    {
      label: "Games",
      value: gamesCount,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: "bg-gradient-to-br from-s8ul-cyan/20 to-s8ul-pink/20",
      iconColor: "text-s8ul-cyan",
    },
  ];

  const quickActions = [
    { href: `${PRODUCTS_ROUTE}/new`, label: "Add Product", color: "admin-btn-cyan" },
    { href: `${AFFILIATES_ROUTE}/new`, label: "Add Affiliate", color: "admin-btn-gold" },
    { href: `${GALLERY_ROUTE}/new`, label: "Add Gallery", color: "admin-btn-outline" },
    { href: `${MILESTONES_ROUTE}/new`, label: "Add Milestone", color: "admin-btn-outline" },
    { href: `${GAMES_ROUTE}/new`, label: "Add Game", color: "admin-btn-outline" },
    { href: "/admin/settings", label: "Settings", color: "admin-btn-cyan" },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="admin-gradient-text text-2xl font-bold font-display sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-400">Welcome back to your admin panel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8"
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <span className={`${action.color} w-full text-center text-sm`}>
                + {action.label}
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
