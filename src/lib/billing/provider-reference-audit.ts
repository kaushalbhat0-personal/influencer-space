/**
 * P0-1 — BillingInvoice.providerReference Duplicates Audit
 *
 * Do NOT auto-merge/delete duplicates. Report them and provide safe remediation.
 * Adding DB uniqueness only when safe — this module is the pre-migration gate.
 */

import { prisma } from "@/lib/prisma";

export interface DuplicateGroup {
  providerReference: string;
  count: number;
  invoiceIds: string[];
  workspaceIds: (string | null)[];
  statuses: string[];
}

export async function findProviderReferenceDuplicates(limit = 100): Promise<DuplicateGroup[]> {
  // Raw query for grouped duplicates where providerReference IS NOT NULL
  const rows = (await prisma.$queryRaw<Array<{ providerReference: string; cnt: bigint }>>`
    SELECT "providerReference", COUNT(*) as cnt
    FROM "BillingInvoice"
    WHERE "providerReference" IS NOT NULL AND "providerReference" != ''
    GROUP BY "providerReference"
    HAVING COUNT(*) > 1
    ORDER BY cnt DESC
    LIMIT ${limit}
  `) as Array<{ providerReference: string; cnt: bigint }>;

  const groups: DuplicateGroup[] = [];
  for (const r of rows) {
    const invoices = await prisma.billingInvoice.findMany({
      where: { providerReference: r.providerReference },
      select: { id: true, workspaceId: true, status: true },
      orderBy: { createdAt: "asc" },
    });
    groups.push({
      providerReference: r.providerReference,
      count: Number(r.cnt),
      invoiceIds: invoices.map((i) => i.id),
      workspaceIds: invoices.map((i) => i.workspaceId),
      statuses: invoices.map((i) => i.status),
    });
  }
  return groups;
}

export async function auditProviderReferenceSafety(): Promise<{ safe: boolean; duplicateCount: number; groups: DuplicateGroup[] }> {
  const groups = await findProviderReferenceDuplicates(10);
  const duplicateCount = groups.reduce((s, g) => s + g.count, 0);
  return { safe: groups.length === 0, duplicateCount, groups };
}

/**
 * Safe remediation path (manual, no auto-delete):
 * 1. Run findProviderReferenceDuplicates() in prod.
 * 2. For each group, keep earliest PAID invoice, mark later duplicates as PENDING_REVIEW via metadata.
 * 3. Only after all groups are manually resolved and verified, apply migration that adds
 *    UNIQUE("providerReference") WHERE "providerReference" IS NOT NULL.
 * Migration file: prisma/migrations/20260912000000_add_billing_invoice_provider_reference_unique/migration.sql
 * is additive and contains NOT VALID initial creation + manual VALIDATE after cleanup.
 */
