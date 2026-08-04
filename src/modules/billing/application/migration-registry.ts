/**
 * Billing Migration Registry — IMPLEMENTATION-39.
 *
 * Tracks every consumer of the LEGACY Subscription table and its migration
 * state. Visible in diagnostics only (never affects behavior). As consumers
 * move to Billing v2 they are marked migrated here; the registry reports
 * migration %, remaining readers/writers and remaining work.
 */

export type LegacyConsumerKind = "reader" | "writer";

export interface LegacyConsumer {
  id: string;
  kind: LegacyConsumerKind;
  /** Original file that read/wrote the legacy Subscription table. */
  file: string;
  migrated: boolean;
  note: string;
}

/** Canonical registry of legacy Subscription consumers (audit-derived). */
export const LEGACY_CONSUMERS: LegacyConsumer[] = [
  { id: "theme-marketplace", kind: "reader", file: "app/admin/themes/page.tsx", migrated: true, note: "IMPLEMENTATION-33 → resolveActivePlan" },
  { id: "builder-overview", kind: "reader", file: "actions/builder-overview.actions.ts", migrated: true, note: "IMPLEMENTATION-33 → resolveActivePlan" },
  { id: "workspace-chip", kind: "reader", file: "features/builder/components/workspace.tsx", migrated: true, note: "IMPLEMENTATION-33 → builder-overview" },
  { id: "super-admin-subscriptions", kind: "reader", file: "app/super-admin/subscriptions/page.tsx", migrated: true, note: "IMPLEMENTATION-33 → listAllSubscriptions" },
  { id: "super-admin-revenue", kind: "reader", file: "app/super-admin/revenue/page.tsx", migrated: true, note: "IMPLEMENTATION-33 → listAllSubscriptions (MRR fixed in 39)" },
  { id: "subscription-metrics", kind: "reader", file: "services/super-admin.service.ts", migrated: true, note: "IMPLEMENTATION-39 → v2 only" },
  { id: "legacy-pro-count", kind: "reader", file: "modules/billing/infrastructure/repository.ts (countProSubscriptionsLegacy)", migrated: true, note: "IMPLEMENTATION-39 → v2 only" },
  { id: "tenants-list", kind: "reader", file: "services/super-admin.service.ts (getAllTenants)", migrated: false, note: "IMPLEMENTATION-39 → resolvePlansForTenantIds" },
  { id: "tenant-detail", kind: "reader", file: "app/super-admin/tenants/[id]/page.tsx", migrated: false, note: "IMPLEMENTATION-39 → resolveActivePlan" },
  { id: "update-subscription-plan", kind: "writer", file: "actions/super-admin.actions.ts", migrated: false, note: "IMPLEMENTATION-39 → BillingService.adminSetPlan" },
];

export interface MigrationStatus {
  total: number;
  migratedCount: number;
  migrationPercent: number;
  remaining: LegacyConsumer[];
  remainingReaders: LegacyConsumer[];
  remainingWriters: LegacyConsumer[];
}

export class BillingMigrationRegistry {
  private consumers: Map<string, LegacyConsumer> = new Map(LEGACY_CONSUMERS.map((c) => [c.id, c]));

  markMigrated(id: string): boolean {
    const consumer = this.consumers.get(id);
    if (!consumer) return false;
    consumer.migrated = true;
    return true;
  }

  get(id: string): LegacyConsumer | undefined {
    return this.consumers.get(id);
  }

  list(): LegacyConsumer[] {
    return Array.from(this.consumers.values());
  }

  getStatus(): MigrationStatus {
    const all = this.list();
    const migratedCount = all.filter((c) => c.migrated).length;
    const remaining = all.filter((c) => !c.migrated);
    return {
      total: all.length,
      migratedCount,
      migrationPercent: all.length > 0 ? Math.round((migratedCount / all.length) * 100) : 100,
      remaining,
      remainingReaders: remaining.filter((c) => c.kind === "reader"),
      remainingWriters: remaining.filter((c) => c.kind === "writer"),
    };
  }
}

export const billingMigrationRegistry = new BillingMigrationRegistry();
