/**
 * Platform Integrity Runtime — IMPLEMENTATION-56.2
 *
 * Dependency Graph Registry, Preview Engine, Safe Deletion Runtime,
 * Orphan Detection, Repair Runtime, Integrity Scanner, Cleanup Runtime.
 */
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability/error-tracker";
import { logger } from "@/lib/observability/logger";
import { logAction } from "@/lib/audit";

// ── Types ─────────────────────────────────────────────────────
export interface DependencyNode {
  model: string;
  label: string;
  query: (tenantId: string) => Promise<number>;
  canDelete: boolean;
  /** "hard" = permanent, "soft" = reversible, "archive" = audit-only, "never" = forbidden */
  deletePolicy: "hard" | "soft" | "archive" | "never";
}

export interface DeletionPreview {
  tenantId?: string;
  label: string;
  items: Array<{ label: string; count: number; policy: string }>;
  totalRecords: number;
  estimatedSeconds: number;
}

export interface IntegrityReport {
  status: "healthy" | "warning" | "critical";
  issues: Array<{ category: string; label: string; count: number; severity: "low" | "medium" | "high" }>;
  scannedAt: string;
  totalIssues: number;
}

// ── Tenant Dependency Graph ──────────────────────────────────
const TENANT_DEPENDENCIES: DependencyNode[] = [
  { model: "Website", label: "Website", query: (tenantId) => prisma.website.count({ where: { tenantId } }), canDelete: true, deletePolicy: "hard" },
  { model: "User", label: "User account", query: (tenantId) => prisma.user.count({ where: { tenantId } }), canDelete: true, deletePolicy: "soft" },
  { model: "Product", label: "Products", query: (tenantId) => prisma.product.count({ where: { tenantId } }), canDelete: true, deletePolicy: "hard" },
  { model: "ProductOrder", label: "Orders", query: (tenantId) => prisma.productOrder.count({ where: { tenantId } }), canDelete: true, deletePolicy: "archive" },
  { model: "Booking", query: (tenantId) => prisma.booking.count({ where: { tenantId } }), label: "Bookings", canDelete: true, deletePolicy: "hard" },
  { model: "Offering", query: (tenantId) => prisma.offering.count({ where: { tenantId } }), label: "Offerings (Services/Courses)", canDelete: true, deletePolicy: "hard" },
  { model: "Purchase", query: (tenantId) => prisma.purchase.count({ where: { tenantId } }), label: "Purchases", canDelete: true, deletePolicy: "archive" },
  { model: "GalleryImage", query: (tenantId) => prisma.galleryImage.count({ where: { tenantId } }), label: "Gallery images", canDelete: true, deletePolicy: "hard" },
  { model: "Asset", query: (tenantId) => prisma.asset.count({ where: { tenantId } }), label: "Media files", canDelete: true, deletePolicy: "hard" },
  { model: "TimelineEvent", query: (tenantId) => prisma.timelineEvent.count({ where: { tenantId } }), label: "Timeline events", canDelete: true, deletePolicy: "hard" },
  { model: "ContactSubmission", query: (tenantId) => prisma.contactSubmission.count({ where: { tenantId } }), label: "Messages", canDelete: true, deletePolicy: "hard" },
  { model: "AnalyticsEvent", query: (tenantId) => prisma.analyticsEvent.count({ where: { tenantId } }), label: "Analytics events", canDelete: true, deletePolicy: "hard" },
  { model: "AuditLog", query: (tenantId) => prisma.auditLog.count({ where: { tenantId } }), label: "Audit entries", canDelete: true, deletePolicy: "archive" },
  { model: "BillingSubscription", query: (tenantId) => prisma.billingSubscription.count({ where: { workspace: { tenantId } } }), label: "Billing subscription", canDelete: true, deletePolicy: "archive" },
  { model: "BillingInvoice", query: (tenantId) => prisma.billingInvoice.count({ where: { workspace: { tenantId } } }), label: "Invoices", canDelete: true, deletePolicy: "never" },
  { model: "BillingEvent", query: (tenantId) => prisma.billingEvent.count({ where: { workspace: { tenantId } } }), label: "Billing events", canDelete: true, deletePolicy: "archive" },
  { model: "Subscription", query: (tenantId) => prisma.subscription.count({ where: { tenantId } }), label: "Legacy subscription", canDelete: true, deletePolicy: "hard" },
];

// ── Dependency Preview Engine ────────────────────────────────
export async function previewTenantDeletion(tenantId: string): Promise<DeletionPreview> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const label = tenant?.name || tenantId.slice(0, 8);

  const results = await Promise.all(
    TENANT_DEPENDENCIES.map(async (dep) => {
      try {
        const count = await dep.query(tenantId);
        return { label: dep.label, count, policy: dep.deletePolicy };
      } catch {
        return { label: dep.label, count: 0, policy: dep.deletePolicy };
      }
    })
  );

  const items = results.filter((r) => r.count > 0);
  const totalRecords = items.reduce((sum, r) => sum + r.count, 0);
  const estimatedSeconds = totalRecords * 0.0002; // roughly 5000 records/sec

  return { tenantId, label, items, totalRecords, estimatedSeconds };
}

// ── Safe Deletion Runtime ─────────────────────────────────────
export async function safeDeleteTenant(
  tenantId: string,
  options: { dryRun?: boolean; reason?: string }
): Promise<{ success: boolean; preview: DeletionPreview; error?: string; durationMs: number }> {
  const start = Date.now();
  const preview = await previewTenantDeletion(tenantId);
  if (preview.items.length === 0) {
    return { success: false, preview, error: "No tenant data found to delete.", durationMs: Date.now() - start };
  }

  if (options.dryRun) {
    return { success: true, preview, durationMs: Date.now() - start };
  }

  try {
    // Log pre-deletion audit
    logger.info("safeDeleteTenant started", "integrity", {
      operation: "delete_tenant", metadata: { tenantId, reason: options.reason, affectedRecords: preview.totalRecords } as Record<string, unknown>,
    });

    // VALIDATION-04: a single transaction so a mid-way failure cannot leave a
    // half-deleted tenant (previously the website/user/tenant deletes ran
    // outside the transaction).
    await prisma.$transaction(async (tx) => {
      await tx.analyticsEvent.deleteMany({ where: { tenantId } });
      await tx.contactSubmission.deleteMany({ where: { tenantId } });
      await tx.timelineEvent.deleteMany({ where: { tenantId } });
      await tx.purchase.deleteMany({ where: { tenantId } });
      await tx.booking.deleteMany({ where: { tenantId } });
      await tx.productOrder.deleteMany({ where: { tenantId } });
      await tx.product.deleteMany({ where: { tenantId } });
      await tx.galleryImage.deleteMany({ where: { tenantId } });
      await tx.offering.deleteMany({ where: { tenantId } });
      await tx.asset.deleteMany({ where: { tenantId } });
      await tx.auditLog.deleteMany({ where: { tenantId } });
      await tx.subscription.deleteMany({ where: { tenantId } });

      // Billing + orphan-prone rows via the workspace.
      const workspace = await tx.workspace.findUnique({ where: { tenantId } });
      if (workspace) {
        await tx.generationSession.deleteMany({ where: { workspaceId: workspace.id } });
        await tx.billingEvent.deleteMany({ where: { workspaceId: workspace.id } });
        await tx.billingInvoice.deleteMany({ where: { workspaceId: workspace.id } });
        await tx.billingSubscription.deleteMany({ where: { workspaceId: workspace.id } });
        await tx.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
        await tx.workspace.delete({ where: { id: workspace.id } });
      }
      await tx.creatorProvisionRun.deleteMany({ where: { tenantId } });
      await tx.billingAccount.deleteMany({ where: { accountId: tenantId } });
      await tx.alertRecord.deleteMany({ where: { tenantId } });

      await tx.website.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });
    });

    logger.info("safeDeleteTenant completed", "integrity", {
      operation: "delete_tenant", duration: Date.now() - start,
      metadata: { result: "success", affectedRecords: preview.totalRecords } as Record<string, unknown>,
    });

    return { success: true, preview, durationMs: Date.now() - start };
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { service: "integrity", operation: "deleteTenant" });
    return { success: false, preview, error: err instanceof Error ? err.message : "Deletion failed", durationMs: Date.now() - start };
  }
}

// ── Orphan Detection ─────────────────────────────────────────
export async function detectOrphans(): Promise<IntegrityReport["issues"]> {
  const issues: IntegrityReport["issues"] = [];
  const add = (category: string, label: string, count: number, severity: "low" | "medium" | "high") => {
    if (count > 0) issues.push({ category, label, count, severity });
  };

  try {
    // Workspaces without tenants
    const orphanWorkspaces = await prisma.workspace.count({ where: { tenantId: null } });
    add("ownership", "Workspaces without tenant", orphanWorkspaces, "medium");

    // Users without tenants (not super-admin or agency)
    const orphanUsers = await prisma.user.count({ where: { tenantId: null, role: { notIn: ["SUPER_ADMIN"] } } });
    add("ownership", "Users without tenant", orphanUsers, "high");

    // Workspace-related orphan checks using join approach
    const workspaces = await prisma.workspace.findMany({ select: { id: true } });
    const workspaceIds = new Set(workspaces.map((w) => w.id));

    const allSubs = await prisma.billingSubscription.findMany({ select: { workspaceId: true } });
    const orphanSubs = allSubs.filter((s) => s.workspaceId && !workspaceIds.has(s.workspaceId)).length;
    add("billing", "Subscriptions without valid workspace", orphanSubs, "medium");

    const allInvoices = await prisma.billingInvoice.findMany({ select: { workspaceId: true } });
    const orphanInvoices = allInvoices.filter((i) => i.workspaceId && !workspaceIds.has(i.workspaceId)).length;
    add("billing", "Invoices without valid workspace", orphanInvoices, "low");

    // Bookings/Sites with invalid tenants
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    const tenantIds = new Set(tenants.map((t) => t.id));

    const allBookings = await prisma.booking.findMany({ select: { tenantId: true } });
    const orphanBookings = allBookings.filter((b) => !tenantIds.has(b.tenantId)).length;
    add("ownership", "Bookings with invalid tenant", orphanBookings, "low");

    const allWebsites = await prisma.website.findMany({ select: { tenantId: true } });
    const orphanWebsites = allWebsites.filter((w) => !tenantIds.has(w.tenantId)).length;
    add("ownership", "Websites with invalid tenant", orphanWebsites, "medium");

    // Negative partner ledger balances
    const negativeBalances = await prisma.partnerLedger.findMany({
      where: { balanceAfter: { lt: 0 } },
      select: { partnerId: true },
    });
    if (negativeBalances.length > 0) {
      add("finance", "Negative ledger balances", negativeBalances.length, "high");
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { service: "integrity", operation: "detectOrphans" });
  }

  return issues;
}

// ── Integrity Scanner ─────────────────────────────────────────
export async function runIntegrityScan(): Promise<IntegrityReport> {
  const issues = await detectOrphans();
  const total = issues.reduce((sum, i) => sum + i.count, 0);
  let status: IntegrityReport["status"] = "healthy";
  if (issues.some((i) => i.severity === "high")) status = "critical";
  else if (issues.some((i) => i.severity === "medium")) status = "warning";

  return { status, issues, scannedAt: new Date().toISOString(), totalIssues: total };
}

// ── Cleanup Runtime ───────────────────────────────────────────
export async function runSafeCleanup(): Promise<{ cleared: number; details: string[] }> {
  let cleared = 0;
  const details: string[] = [];

  try {
    // VALIDATION-04: recover stuck sessions — nothing ever sets `timed_out`,
    // so a session stranded mid-action (serverless timeout, crash) stayed
    // `running`/`publishing` forever. Mark stale active sessions timed_out so
    // the terminal-status cleanup below (and the ops snapshot) reflect reality.
    const staleActiveCutoff = new Date(Date.now() - 60 * 60 * 1000);
    const stuck = await prisma.generationSession.updateMany({
      where: { status: { in: ["queued", "running", "publishing"] }, updatedAt: { lt: staleActiveCutoff } },
      data: { status: "timed_out" },
    });
    if (stuck.count > 0) {
      cleared += stuck.count;
      details.push(`Recovered ${stuck.count} stuck generation sessions (marked timed_out)`);
    }

    // Stale generation sessions (> 7 days)
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const staleSessions = await prisma.generationSession.findMany({
      where: { status: { in: ["failed", "cancelled", "timed_out"] }, startedAt: { lt: cutoff } },
      select: { id: true },
    });
    if (staleSessions.length > 0) {
      await prisma.generationSession.deleteMany({ where: { id: { in: staleSessions.map((s) => s.id) } } });
      cleared += staleSessions.length;
      details.push(`Cleared ${staleSessions.length} stale generation sessions`);
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { service: "integrity", operation: "cleanup" });
  }

  try {
    // Expired partner invites (> 30 days)
    const inviteCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expiredInvites = await prisma.partnerInvite.count({ where: { createdAt: { lt: inviteCutoff }, status: "pending" } });
    if (expiredInvites > 0) {
      await prisma.partnerInvite.deleteMany({ where: { createdAt: { lt: inviteCutoff }, status: "pending" } });
      cleared += expiredInvites;
      details.push(`Expired ${expiredInvites} stale partner invites`);
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { service: "integrity", operation: "cleanupInvites" });
  }

  // RCCF-62 — inactive free-trial Agency cleanup (scheduled, server-side).
  try {
    const agencyCleanup = await cleanupExpiredTrialAgencies();
    if (agencyCleanup.deleted > 0 || agencyCleanup.retained > 0) {
      cleared += agencyCleanup.deleted;
      details.push(`Agency trial cleanup: deleted ${agencyCleanup.deleted}, retained ${agencyCleanup.retained}`);
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { service: "integrity", operation: "cleanupExpiredAgencies" });
  }

  return { cleared, details };
}

/**
 * RCCF-62 — delete an inactive free-trial Agency whose trial expired >= 15 days
 * ago, with no active clients and NO financial obligation. Runs server-side only
 * (never from page/middleware/login/client). Idempotent: re-running after a
 * deletion finds nothing to do.
 *
 * CREATOR BOUNDARY: this never deletes a Creator Tenant, Website, Asset, storage,
 * subscription, or any Creator financial record. Only the Agency-owned shell is
 * removed once it is provably free of obligations.
 */
export async function cleanupExpiredTrialAgencies(): Promise<{ deleted: number; retained: number }> {
  const agencies = await prisma.websiteAgency.findMany({ select: { id: true } });
  let deleted = 0;
  let retained = 0;
  for (const agency of agencies) {
    try {
      if (await isInactiveAgencyDeletionEligible(agency.id)) {
        await deleteInactiveAgency(agency.id);
        deleted++;
      } else {
        retained++;
      }
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { service: "integrity", operation: "agencyEligibility" });
      retained++;
    }
  }
  return { deleted, retained };
}

/**
 * Safety gate — every condition must hold before an inactive Agency may be
 * removed. Financial history is NEVER destroyed because platform access ended.
 */
export async function isInactiveAgencyDeletionEligible(agencyId: string): Promise<boolean> {
  const graceMs = 15 * 24 * 60 * 60 * 1000; // 15 days after expiry
  const workspace = await prisma.workspace.findUnique({ where: { agencyId }, select: { id: true } });
  if (!workspace) return false;

  const [subscription, activeClients, commissionCount, ledgerCount, settlementCount, payoutCount, invoiceCount] = await Promise.all([
    prisma.billingSubscription.findFirst({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" }, select: { status: true, trialEndsAt: true } }),
    prisma.agencyTenant.count({ where: { agencyId, status: "ACTIVE" } }),
    prisma.commissionEntry.count({ where: { partnerId: agencyId } }),
    prisma.partnerLedger.count({ where: { partnerId: agencyId } }),
    prisma.settlement.count({ where: { partnerId: agencyId } }),
    prisma.payoutBatch.count({ where: { partnerId: agencyId } }),
    prisma.billingInvoice.count({ where: { accountId: workspace.id } }),
  ]);

  // No paid plan and the trial expired >= 15 days ago.
  const isFree = subscription?.status === "TRIALING";
  if (!isFree) return false;
  if (!subscription?.trialEndsAt) return false;
  if (Date.now() - subscription.trialEndsAt.getTime() < graceMs) return false;

  // No active clients and no financial obligation → safe to remove.
  if (activeClients > 0) return false;
  if (commissionCount > 0 || ledgerCount > 0 || settlementCount > 0 || payoutCount > 0 || invoiceCount > 0) return false;
  return true;
}

/** Delete the Agency-owned shell in a single transaction. Never touches Creator data. */
async function deleteInactiveAgency(agencyId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.findUnique({ where: { agencyId }, select: { id: true } });
    if (workspace) {
      await tx.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
      await tx.agencyTeamInvitation.deleteMany({ where: { workspaceId: workspace.id } });
      await tx.clientAssignment.deleteMany({ where: { workspaceId: workspace.id } });
      await tx.billingSubscription.deleteMany({ where: { workspaceId: workspace.id } });
      await tx.billingEvent.deleteMany({ where: { workspaceId: workspace.id } });
      await tx.workspace.delete({ where: { id: workspace.id } });
    }
    await tx.agencyTenant.deleteMany({ where: { agencyId } });
    await tx.agencyCapacityAddon.deleteMany({ where: { agencyId } });
    await tx.auditLog.deleteMany({ where: { agencyId } });
    // Agency-owned users only (never a Creator user — those have tenantId).
    await tx.user.deleteMany({ where: { agencyId, tenantId: null } });
    await tx.websiteAgency.delete({ where: { id: agencyId } });
  });
  await logAction("system", "agency:inactive-trial-account-deleted", { agencyId }).catch(() => {});
}
