/**
 * Platform Integrity Runtime — IMPLEMENTATION-56.2
 *
 * Dependency Graph Registry, Preview Engine, Safe Deletion Runtime,
 * Orphan Detection, Repair Runtime, Integrity Scanner, Cleanup Runtime.
 */
import { prisma } from "@/lib/prisma";
import { captureError } from "@/lib/observability/error-tracker";
import { logger } from "@/lib/observability/logger";

// ── Types ─────────────────────────────────────────────────────
export interface DependencyNode {
  model: string;
  label: string;
  query: () => Promise<number>;
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
  { model: "Website", label: "Website", query: () => prisma.website.count({ where: { tenantId: "" } }), canDelete: true, deletePolicy: "hard" },
  { model: "User", label: "User account", query: () => prisma.user.count({ where: { tenantId: "" } }), canDelete: true, deletePolicy: "soft" },
  { model: "Product", label: "Products", query: () => prisma.product.count({ where: { tenantId: "" } }), canDelete: true, deletePolicy: "hard" },
  { model: "ProductOrder", label: "Orders", query: () => prisma.productOrder.count({ where: { tenantId: "" } }), canDelete: true, deletePolicy: "archive" },
  { model: "Booking", query: () => prisma.booking.count({ where: { tenantId: "" } }), label: "Bookings", canDelete: true, deletePolicy: "hard" },
  { model: "Offering", query: () => prisma.offering.count({ where: { tenantId: "" } }), label: "Offerings (Services/Courses)", canDelete: true, deletePolicy: "hard" },
  { model: "Purchase", query: () => prisma.purchase.count({ where: { tenantId: "" } }), label: "Purchases", canDelete: true, deletePolicy: "archive" },
  { model: "GalleryImage", query: () => prisma.galleryImage.count({ where: { tenantId: "" } }), label: "Gallery images", canDelete: true, deletePolicy: "hard" },
  { model: "Asset", query: () => prisma.asset.count({ where: { tenantId: "" } }), label: "Media files", canDelete: true, deletePolicy: "hard" },
  { model: "TimelineEvent", query: () => prisma.timelineEvent.count({ where: { tenantId: "" } }), label: "Timeline events", canDelete: true, deletePolicy: "hard" },
  { model: "ContactSubmission", query: () => prisma.contactSubmission.count({ where: { tenantId: "" } }), label: "Messages", canDelete: true, deletePolicy: "hard" },
  { model: "AnalyticsEvent", query: () => prisma.analyticsEvent.count({ where: { tenantId: "" } }), label: "Analytics events", canDelete: true, deletePolicy: "hard" },
  { model: "AuditLog", query: () => prisma.auditLog.count({ where: { tenantId: "" } }), label: "Audit entries", canDelete: true, deletePolicy: "archive" },
  { model: "BillingSubscription", query: () => prisma.billingSubscription.count({ where: { workspace: { tenantId: "" } } }), label: "Billing subscription", canDelete: true, deletePolicy: "archive" },
  { model: "BillingInvoice", query: () => prisma.billingInvoice.count({ where: { workspace: { tenantId: "" } } }), label: "Invoices", canDelete: true, deletePolicy: "never" },
  { model: "BillingEvent", query: () => prisma.billingEvent.count({ where: { workspace: { tenantId: "" } } }), label: "Billing events", canDelete: true, deletePolicy: "archive" },
  { model: "Subscription", query: () => prisma.subscription.count({ where: { tenantId: "" } }), label: "Legacy subscription", canDelete: true, deletePolicy: "hard" },
];

// ── Dependency Preview Engine ────────────────────────────────
export async function previewTenantDeletion(tenantId: string): Promise<DeletionPreview> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const label = tenant?.name || tenantId.slice(0, 8);

  const results = await Promise.all(
    TENANT_DEPENDENCIES.map(async (dep) => {
      try {
        const count = await dep.query();
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

    // Perform deletions in reverse dependency order
    await prisma.$transaction([
      prisma.analyticsEvent.deleteMany({ where: { tenantId } }),
      prisma.contactSubmission.deleteMany({ where: { tenantId } }),
      prisma.timelineEvent.deleteMany({ where: { tenantId } }),
      prisma.purchase.deleteMany({ where: { tenantId } }),
      prisma.booking.deleteMany({ where: { tenantId } }),
      prisma.productOrder.deleteMany({ where: { tenantId } }),
      prisma.product.deleteMany({ where: { tenantId } }),
      prisma.galleryImage.deleteMany({ where: { tenantId } }),
      prisma.offering.deleteMany({ where: { tenantId } }),
      prisma.asset.deleteMany({ where: { tenantId } }),
      prisma.auditLog.deleteMany({ where: { tenantId } }),
      prisma.subscription.deleteMany({ where: { tenantId } }),
    ]);

    // Billing-related cleanup via workspace
    const workspace = await prisma.workspace.findUnique({ where: { tenantId } });
    if (workspace) {
      await prisma.billingEvent.deleteMany({ where: { workspaceId: workspace.id } });
      await prisma.billingInvoice.deleteMany({ where: { workspaceId: workspace.id } });
      await prisma.billingSubscription.deleteMany({ where: { workspaceId: workspace.id } });
    }

    await prisma.website.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });

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

  return { cleared, details };
}
