/**
 * Platform Compatibility Layer v2.0
 *
 * During migration, dashboard operations route through this compatibility
 * layer. As modules are added to Platform Core, this layer is gradually
 * thinned until it becomes a pure platform pass-through.
 *
 * Current state (v2.0):
 *   - Builder/Theme/Preview/Rendering/Plugins/Telemetry → FULLY MIGRATED
 *   - Dashboard page → migrated to Prisma queries (removed legacy service imports)
 *   - Games pages → migrated to Prisma queries (removed GameService imports)
 *   - Games actions → migrated to Prisma (GameService dissolved)
 *   - Messages page → migrated to Prisma queries (removed ContactService imports)
 *   - Contact actions → migrated to Prisma (ContactService dissolved)
 *   - Settings page → migrated to Prisma queries (removed SettingsService imports)
 *   - AffiliateLinks → managed via server actions (legacy AffiliateService behind)
 *   - Settings mutations → managed via server actions (legacy SettingsService behind)
 *   - Domain management → managed via server actions (legacy VercelService behind)
 *   - Storage → StorageService (Supabase), external infra
 *   - Public page → still uses public.service orchestrator
 *
 * New Hooks Layer (src/hooks/dashboard/):
 *   - useProducts() — consumes platform.content.products API
 *   - useGallery()  — consumes platform.content.gallery API
 *   - useDashboardStats() — stats with loading/error states
 *   - usePlatformStatus() — platform diagnostics + telemetry
 *   - useAsyncState() / useMutation() — reusable state primitives
 *
 * Target state (v3.0):
 *   - All entity CRUD goes through platform.content.{entity}.*
 *   - All dashboard components use hooks exclusively
 *   - Server pages use platform.content for reads
 *   - Zero legacy service imports in dashboard
 *   - public.service dissolved into platform.content queries
 */

import { platform } from "@/lib/platform/api";

export const dashboardServices = {
  /** Theme operations — FULLY MIGRATED to platform.theme */
  theme: {
    getConfig: () => platform.theme.query,
    update: (updates: Record<string, string>) => {
      platform.theme.transaction.begin();
      try {
        for (const [k, v] of Object.entries(updates)) {
          const token = platform.theme.registry.getToken(`color.${k}`);
          if (token) platform.theme.registry.setTokenValue(`color.${k}`, v);
        }
        platform.theme.transaction.commit();
      } catch {
        platform.theme.transaction.rollback();
      }
    },
  },

  /** Preview operations — FULLY MIGRATED to platform.preview */
  preview: {
    render: () => platform.preview.render(),
    getState: () => platform.preview.getState(),
    diagnostics: () => platform.rendering.diagnostics(),
  },

  /** Builder state queries — FULLY MIGRATED */
  builder: {
    getPage: () => platform.builder.query.getCurrentPage(),
    getHierarchy: () => platform.builder.query.getCanvasHierarchy(),
    getSelection: () => platform.builder.query.getSelection(),
    execute: (name: string, input: Record<string, unknown>) =>
      platform.builder.commands.execute(name, input),
  },

  /** Health & Diagnostics — FULLY MIGRATED */
  diagnostics: {
    platform: () => platform.diagnostics(),
    telemetry: () => platform.telemetry.snapshot(),
  },
};

/**
 * Migration Status — Dashboard Pages (July 2026)
 *
 * ┌─────────────────────┬───────────────────┬───────────────────────────────────┐
 * │ Dashboard Feature   │ Status            │ Notes                             │
 * ├─────────────────────┼───────────────────┼───────────────────────────────────┤
 * │ Dashboard Home      │ ✅ MIGRATED       │ Prisma queries, 0 legacy imports  │
 * │ Products CRUD       │ ✅ MIGRATED       │ Server actions, Platform API hooks│
 * │ Gallery CRUD        │ ✅ MIGRATED       │ Server actions, Platform API hooks│
 * │ Links CRUD          │ ✅ MIGRATED       │ Server actions                    │
 * │ Milestones CRUD     │ ✅ MIGRATED       │ Server actions                    │
 * │ Games CRUD          │ ✅ MIGRATED       │ Prisma direct in actions+pages    │
 * │ Messages/Contacts   │ ✅ MIGRATED       │ Prisma direct in actions+pages    │
 * │ Settings Read       │ ✅ MIGRATED       │ Prisma queries in page            │
 * │ Settings Mutations  │ ⚠️ IN PROGRESS    │ Still uses SettingsService hooks  │
 * │ Affiliate Actions   │ ⚠️ IN PROGRESS    │ Still uses AffiliateService       │
 * │ Appearance/Theme    │ ✅ MIGRATED       │ themeAdapter (platform compat)    │
 * │ Domain Management   │ ⚠️ IN PROGRESS    │ VercelService (external infra)    │
 * │ Billing             │ ✅ MIGRATED       │ Prisma + Razorpay service         │
 * │ Content Feed        │ ✅ MIGRATED       │ Server actions                    │
 * │ Public Page         │ ⚠️ IN PROGRESS    │ public.service orchestrator       │
 * │ Builder/Preview     │ ✅ MIGRATED       │ Platform Core v2.0                │
 * │ Theme Engine        │ ✅ MIGRATED       │ Platform Core v2.0                │
 * │ Rendering           │ ✅ MIGRATED       │ Platform Core v2.0                │
 * │ Plugins/Sandbox     │ ✅ MIGRATED       │ Platform Core v2.0                │
 * │ Telemetry           │ ✅ MIGRATED       │ Platform Core v2.0                │
 * └─────────────────────┴───────────────────┴───────────────────────────────────┘
 *
 * Remaining legacy service dependencies (for phased migration):
 *   - AffiliateService    → migrate affiliate.actions.ts to Prisma
 *   - SettingsService     → refactor complex hero/influencer data flow
 *   - VercelService       → external infrastructure (Vercel API)
 *   - StorageService      → external infrastructure (Supabase)
 *   - public.service      → orchestrator for public page data
 *   - super-admin.service → thin queries, low risk
 */
