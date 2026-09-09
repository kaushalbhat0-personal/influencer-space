// ── Communication — Application Runtime ─────────────────────
// RCCF-TRACK-02 Phases 1, 6-7, 13-14. Route → template → deliver → record →
// retry. Notification Center + preferences. No business logic.

import { prisma } from "@/lib/prisma";
import { cache as reactCache } from "react";
import { COMMUNICATION_BY_ID } from "./registry";
import { renderTemplate } from "./templates";
import { getAdapter } from "./adapters";
import type { CommunicationChannel, NotificationPriority, NotificationView, Recipient } from "../domain/types";

const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

export const MAX_BACKOFF_MS = 60_000;

// RCCF-INTEGRATIONS-03 — tenant-owned email routing.
// Only these templates are legally allowed to spend tenant's Resend quota.
const TENANT_OWNED_TEMPLATES = new Set<string>(["order.customer_confirmed"]);

// RCCF-AGENCY-08 — agency-owned email routing.
// These templates are agency/client communications that must use the agency's
// verified Resend account when configured. They must NEVER fall back to the
// platform global RESEND_API_KEY. Absent/unverified → log fallback.
const AGENCY_OWNED_TEMPLATES = new Set<string>(["claim.invitation", "team.invitation"]);

// ── Send (route → template → deliver → log) ─────────────────

export async function sendCommunication(
  templateId: string,
  recipient: Recipient,
  data: Record<string, unknown>,
  opts?: { tenantId?: string },
): Promise<{ success: boolean; error?: string }> {
  const def = COMMUNICATION_BY_ID[templateId];
  if (!def) return { success: false, error: `Unknown communication: ${templateId}` };

  const subject = renderTemplate(def.template.subject, data);
  const body = renderTemplate(def.template.body, data);
  // Preserve tenantId for retries/audit without leaking secrets
  const payload = { ...data, __template: templateId, ...(opts?.tenantId ? { __tenantId: opts.tenantId } : {}) };

  const log = await prisma.communicationLog.create({
    data: {
      templateId, recipient: recipient.recipientId, channel: def.channel,
      status: "queued", provider: def.channel === "email" ? "log" : def.channel,
      payload: payload as never,
    },
  });

  // ── Tenant vs platform decision (RCCF-INTEGRATIONS-03) ──────────
  // order.customer_confirmed → try tenant verified Resend first; if absent, stay on log (do NOT silently use platform)
  // all other email templates → platform Resend (global) if configured, else log
  const adapter = getAdapter(def.channel);
  let deliverReq: { templateId: string; recipient: Recipient; channel: typeof def.channel; subject: string; body: string; payload: Record<string, unknown>; tenantId?: string } = {
    templateId, recipient, channel: def.channel, subject, body, payload,
  };

  if (def.channel === "email" && TENANT_OWNED_TEMPLATES.has(templateId) && opts?.tenantId) {
    try {
      const { getTenantResendConfig } = await import("@/modules/tenant-integration/resend");
      const cfg = await getTenantResendConfig(opts.tenantId);
      if (cfg) {
        const { __testables } = await import("./adapters");
        const tenantAdapter = new __testables.TenantResendAdapter(cfg.apiKey, cfg.emailFrom);
        deliverReq = { ...deliverReq, tenantId: opts.tenantId };
        const tenantResult = await tenantAdapter.deliver(deliverReq).catch((e) => ({ success: false, provider: "tenant_resend", error: e instanceof Error ? e.message : "delivery failed" }));
        if (tenantResult.success) {
          await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "delivered", provider: tenantResult.provider } });
          return { success: true };
        }
        const retries = log.retries + 1;
        const failed = retries >= def.retries;
        await prisma.communicationLog.update({
          where: { id: log.id },
          data: { status: failed ? "failed" : "queued", retries, error: tenantResult.error ?? "delivery failed" },
        });
        return { success: false, error: tenantResult.error ?? "delivery failed" };
      }
      // No verified tenant config → preserve log fallback (not platform)
      // Fall through to EmailLogAdapter below
      const { __testables } = await import("./adapters");
      const logAdapter = new __testables.EmailLogAdapter();
      const result = await logAdapter.deliver(deliverReq).catch((e) => ({ success: false, provider: "log", error: e instanceof Error ? e.message : "delivery failed" }));
      if (result.success) {
        await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "delivered", provider: result.provider } });
        return { success: true };
      }
      const retries = log.retries + 1;
      const failed = retries >= def.retries;
      await prisma.communicationLog.update({
        where: { id: log.id },
        data: { status: failed ? "failed" : "queued", retries, error: result.error ?? "delivery failed" },
      });
      return { success: false, error: result.error ?? "delivery failed" };
    } catch {
      // If tenant lookup fails, fall back to log (never platform for tenant templates)
      const { __testables } = await import("./adapters");
      const logAdapter = new __testables.EmailLogAdapter();
      const result = await logAdapter.deliver(deliverReq).catch(() => ({ success: false, provider: "log", error: "delivery failed" }));
      if (result.success) {
        await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "delivered", provider: result.provider } });
        return { success: true };
      }
      return { success: false, error: result.error ?? "delivery failed" };
    }
  }

  // RCCF-AGENCY-08 — agency-owned templates: NEVER use platform global.
  // opts.tenantId is the agency's tenant (resolved server-side from agencyId).
  // Verified agency config → tenant_resend; absent/unverified/decrypt fail → log.
  if (def.channel === "email" && AGENCY_OWNED_TEMPLATES.has(templateId)) {
    if (opts?.tenantId) {
      try {
        const { getTenantResendConfig } = await import("@/modules/tenant-integration/resend");
        const cfg = await getTenantResendConfig(opts.tenantId);
        if (cfg) {
          const { __testables } = await import("./adapters");
          const tenantAdapter = new __testables.TenantResendAdapter(cfg.apiKey, cfg.emailFrom);
          const agencyReq = { ...deliverReq, tenantId: opts.tenantId };
          const agencyResult = await tenantAdapter.deliver(agencyReq).catch((e) => ({ success: false, provider: "tenant_resend", error: e instanceof Error ? e.message : "delivery failed" }));
          if (agencyResult.success) {
            await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "delivered", provider: agencyResult.provider } });
            return { success: true };
          }
          const retries = log.retries + 1;
          const failed = retries >= def.retries;
          await prisma.communicationLog.update({
            where: { id: log.id },
            data: { status: failed ? "failed" : "queued", retries, error: agencyResult.error ?? "delivery failed" },
          });
          return { success: false, error: agencyResult.error ?? "delivery failed" };
        }
      } catch {
        // fall through to log fallback below
      }
    }
    // No verified agency config or no agency tenantId → log fallback, never platform
    try {
      const { __testables } = await import("./adapters");
      const logAdapter = new __testables.EmailLogAdapter();
      const result = await logAdapter.deliver(deliverReq).catch((e) => ({ success: false, provider: "log", error: e instanceof Error ? e.message : "delivery failed" }));
      if (result.success) {
        await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "delivered", provider: result.provider } });
        return { success: true };
      }
      const retries = log.retries + 1;
      const failed = retries >= def.retries;
      await prisma.communicationLog.update({
        where: { id: log.id },
        data: { status: failed ? "failed" : "queued", retries, error: result.error ?? "delivery failed" },
      });
      return { success: false, error: result.error ?? "delivery failed" };
    } catch {
      const { __testables } = await import("./adapters");
      const logAdapter = new __testables.EmailLogAdapter();
      const result = await logAdapter.deliver(deliverReq).catch(() => ({ success: false, provider: "log", error: "delivery failed" }));
      if (result.success) {
        await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "delivered", provider: result.provider } });
        return { success: true };
      }
      return { success: false, error: result.error ?? "delivery failed" };
    }
  }

  if (!adapter) {
    await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "failed", error: "No adapter" } });
    return { success: false, error: "No adapter for channel" };
  }

  const result = await adapter.deliver(deliverReq as never).catch((e) => ({ success: false, provider: "none", error: e instanceof Error ? e.message : "delivery failed" }));
  if (result.success) {
    await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "delivered", provider: result.provider } });
    return { success: true };
  }

  const retries = log.retries + 1;
  const failed = retries >= def.retries;
  await prisma.communicationLog.update({
    where: { id: log.id },
    data: { status: failed ? "failed" : "queued", retries, error: result.error ?? "delivery failed" },
  });
  return { success: false, error: result.error ?? "delivery failed" };
}

/** Direct in-app notification (preference-checked). */
export async function sendNotification(params: { recipient: Recipient; category: string; title: string; body?: string; priority?: NotificationPriority; data?: Record<string, unknown> }): Promise<void> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { audience_recipientId_category: { audience: params.recipient.audience, recipientId: params.recipient.recipientId, category: params.category } },
    select: { channel: true },
  });
  if (pref?.channel === "none") return;
  await prisma.notification.create({
    data: {
      audience: params.recipient.audience,
      recipientId: params.recipient.recipientId,
      category: params.category,
      title: params.title,
      body: params.body ?? null,
      priority: params.priority ?? "medium",
      channel: "in_app",
      data: params.data as never,
    },
  });
}

// ── Notification Center (Phase 6) ────────────────────────────

export async function listNotifications(recipient: Recipient, params: { unreadOnly?: boolean; category?: string; search?: string; limit?: number; offset?: number } = {}): Promise<{ items: NotificationView[]; total: number; unread: number }> {
  const where: Record<string, unknown> = { audience: recipient.audience, recipientId: recipient.recipientId };
  if (params.unreadOnly) where.readAt = null;
  if (params.category) where.category = params.category;

  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: params.limit ?? 50, skip: params.offset ?? 0 }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, readAt: null } }),
  ]);

  let items = rows.map(serializeNotification);
  if (params.search) {
    const q = params.search.toLowerCase();
    items = items.filter((n) => n.title.toLowerCase().includes(q) || (n.body ?? "").toLowerCase().includes(q));
  }
  return { items, total, unread };
}

export async function markNotificationRead(id: string, recipient: Recipient): Promise<void> {
  await prisma.notification.updateMany({ where: { id, audience: recipient.audience, recipientId: recipient.recipientId }, data: { readAt: new Date() } });
}

export async function markAllNotificationsRead(recipient: Recipient): Promise<void> {
  await prisma.notification.updateMany({ where: { audience: recipient.audience, recipientId: recipient.recipientId, readAt: null }, data: { readAt: new Date() } });
}

export async function archiveNotification(id: string, recipient: Recipient): Promise<void> {
  await prisma.notification.updateMany({ where: { id, audience: recipient.audience, recipientId: recipient.recipientId }, data: { archivedAt: new Date() } });
}

export async function deleteNotification(id: string, recipient: Recipient): Promise<void> {
  await prisma.notification.deleteMany({ where: { id, audience: recipient.audience, recipientId: recipient.recipientId } });
}

export const getUnreadCountCached = requestCache(async (recipient: Recipient): Promise<number> => {
  return prisma.notification.count({ where: { audience: recipient.audience, recipientId: recipient.recipientId, readAt: null } });
});

function serializeNotification(n: { id: string; category: string; title: string; body: string | null; priority: string; readAt: Date | null; archivedAt: Date | null; createdAt: Date }): NotificationView {
  return { id: n.id, category: n.category, title: n.title, body: n.body, priority: n.priority as NotificationPriority, read: !!n.readAt, archived: !!n.archivedAt, createdAt: n.createdAt.toISOString() };
}

// ── Preferences (Phase 7) ────────────────────────────────────

export const NOTIFICATION_CATEGORIES = [
  "commerce", "orders", "payments", "builder", "website", "recommendations",
  "business_health", "billing", "security", "marketing", "customer_success", "system",
] as const;

export async function getPreferences(recipient: Recipient): Promise<Record<string, string>> {
  const prefs = await prisma.notificationPreference.findMany({ where: { audience: recipient.audience, recipientId: recipient.recipientId }, select: { category: true, channel: true } });
  const map: Record<string, string> = {};
  for (const c of NOTIFICATION_CATEGORIES) map[c] = "in_app";
  for (const p of prefs) map[p.category] = p.channel;
  return map;
}

export async function setPreference(recipient: Recipient, category: string, channel: string): Promise<void> {
  if (!["email", "in_app", "both", "none"].includes(channel)) throw new Error("Invalid channel");
  await prisma.notificationPreference.upsert({
    where: { audience_recipientId_category: { audience: recipient.audience, recipientId: recipient.recipientId, category } },
    update: { channel },
    create: { audience: recipient.audience, recipientId: recipient.recipientId, category, channel },
  });
}

// ── Retry runtime (Phase 14) ─────────────────────────────────

export async function retryFailedCommunications(limit = 50): Promise<{ retried: number; deadLettered: number }> {
  const failed = await prisma.communicationLog.findMany({ where: { status: "queued" }, orderBy: { createdAt: "asc" }, take: limit });
  let retried = 0;
  let deadLettered = 0;
  for (const log of failed) {
    const def = COMMUNICATION_BY_ID[log.templateId];
    if (!def || log.retries >= def.retries) {
      await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "failed", error: "Max retries reached" } });
      deadLettered++;
      continue;
    }
    const recipient: Recipient = { audience: def.audience, recipientId: log.recipient, email: (log.payload as Record<string, unknown> | null)?.["email"] as string | null };
    const payload = (log.payload as Record<string, unknown>) ?? {};
    const subject = renderTemplate(def.template.subject, payload);
    const body = renderTemplate(def.template.body, payload);
    // Respect tenant/agency-owned routing on retry as well
    let adapter = getAdapter(def.channel);
    let deliverReq: Record<string, unknown> = { templateId: log.templateId, recipient, channel: def.channel, subject, body, payload };
    const tenantIdForRetry = (payload["__tenantId"] as string) ?? null;
    if (def.channel === "email" && tenantIdForRetry) {
      if (TENANT_OWNED_TEMPLATES.has(log.templateId)) {
        try {
          const { getTenantResendConfig } = await import("@/modules/tenant-integration/resend");
          const cfg = await getTenantResendConfig(tenantIdForRetry);
          if (cfg) {
            const { __testables } = await import("./adapters");
            adapter = new __testables.TenantResendAdapter(cfg.apiKey, cfg.emailFrom);
            deliverReq = { ...deliverReq, tenantId: tenantIdForRetry };
          } else {
            const { __testables } = await import("./adapters");
            adapter = new __testables.EmailLogAdapter();
          }
        } catch {
          const { __testables } = await import("./adapters");
          adapter = new __testables.EmailLogAdapter();
        }
      } else if (AGENCY_OWNED_TEMPLATES.has(log.templateId)) {
        try {
          const { getTenantResendConfig } = await import("@/modules/tenant-integration/resend");
          const cfg = await getTenantResendConfig(tenantIdForRetry);
          if (cfg) {
            const { __testables } = await import("./adapters");
            adapter = new __testables.TenantResendAdapter(cfg.apiKey, cfg.emailFrom);
            deliverReq = { ...deliverReq, tenantId: tenantIdForRetry };
          } else {
            const { __testables } = await import("./adapters");
            adapter = new __testables.EmailLogAdapter();
          }
        } catch {
          const { __testables } = await import("./adapters");
          adapter = new __testables.EmailLogAdapter();
        }
      }
    }
    const result = adapter ? await adapter.deliver(deliverReq as never).catch(() => ({ success: false, provider: "none", error: "delivery failed" })) : { success: false, provider: "none", error: "no adapter" };
    if (result.success) {
      await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "delivered", retries: log.retries + 1, provider: result.provider, error: null } });
      retried++;
    } else {
      await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "failed", retries: log.retries + 1, error: result.error } });
      deadLettered++;
    }
  }
  return { retried, deadLettered };
}

// ── History + health (Phases 13, 17) ─────────────────────────

export async function getCommunicationHistory(params: { status?: string; limit?: number; offset?: number } = {}): Promise<{ items: Array<{ id: string; templateId: string; recipient: string; channel: string; status: string; provider: string; retries: number; error: string | null; createdAt: string }>; total: number }> {
  const where: Record<string, unknown> = {};
  if (params.status) where.status = params.status;
  const [rows, total] = await Promise.all([
    prisma.communicationLog.findMany({ where, orderBy: { createdAt: "desc" }, take: params.limit ?? 50, skip: params.offset ?? 0 }),
    prisma.communicationLog.count({ where }),
  ]);
  return { items: rows.map((r) => ({ id: r.id, templateId: r.templateId, recipient: r.recipient, channel: r.channel, status: r.status, provider: r.provider, retries: r.retries, error: r.error, createdAt: r.createdAt.toISOString() })), total };
}

export async function getCommunicationHealth(): Promise<{ total: number; delivered: number; failed: number; queued: number; volume: number; failureRate: number; recent: number }> {
  const [total, delivered, failed, queued, recent] = await Promise.all([
    prisma.communicationLog.count(),
    prisma.communicationLog.count({ where: { status: "delivered" } }),
    prisma.communicationLog.count({ where: { status: "failed" } }),
    prisma.communicationLog.count({ where: { status: "queued" } }),
    prisma.communicationLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } } }),
  ]);
  return { total, delivered, failed, queued, volume: total, failureRate: total > 0 ? Math.round((failed / total) * 100) : 0, recent };
}
