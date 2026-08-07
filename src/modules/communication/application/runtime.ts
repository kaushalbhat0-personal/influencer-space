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

// ── Send (route → template → deliver → log) ─────────────────

export async function sendCommunication(templateId: string, recipient: Recipient, data: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  const def = COMMUNICATION_BY_ID[templateId];
  if (!def) return { success: false, error: `Unknown communication: ${templateId}` };

  const subject = renderTemplate(def.template.subject, data);
  const body = renderTemplate(def.template.body, data);
  const payload = { ...data, __template: templateId };

  const log = await prisma.communicationLog.create({
    data: {
      templateId, recipient: recipient.recipientId, channel: def.channel,
      status: "queued", provider: def.channel === "email" ? "log" : def.channel,
      payload: payload as never,
    },
  });

  const adapter = getAdapter(def.channel);
  if (!adapter) {
    await prisma.communicationLog.update({ where: { id: log.id }, data: { status: "failed", error: "No adapter" } });
    return { success: false, error: "No adapter for channel" };
  }

  const result = await adapter.deliver({ templateId, recipient, channel: def.channel, subject, body, payload }).catch((e) => ({ success: false, provider: "none", error: e instanceof Error ? e.message : "delivery failed" }));
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
    const adapter = getAdapter(def.channel);
    const result = adapter ? await adapter.deliver({ templateId: log.templateId, recipient, channel: def.channel, subject, body, payload }).catch(() => ({ success: false, provider: "none", error: "delivery failed" })) : { success: false, provider: "none", error: "no adapter" };
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
