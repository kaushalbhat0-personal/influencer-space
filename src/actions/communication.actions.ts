"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  deleteNotification,
  getUnreadCountCached,
  getPreferences,
  setPreference,
  retryFailedCommunications,
  getCommunicationHistory,
  getCommunicationHealth,
  NOTIFICATION_CATEGORIES,
} from "@/modules/communication";
import type { Recipient } from "@/modules/communication";

function resolveRecipient(session: { user?: { role?: string | null; tenantId?: string | null; email?: string | null; agencyId?: string | null } } | null): Recipient | null {
  const role = session?.user?.role;
  if (role === "SUPER_ADMIN") return { audience: "super_admin", recipientId: "system" };
  const tenantId = session?.user?.tenantId;
  if (role === "ADMIN" && tenantId) return { audience: "creator", recipientId: tenantId, email: session?.user?.email ?? null };
  const agencyId = session?.user?.agencyId;
  if ((role === "AGENCY_ADMIN" || role === "AGENCY_STAFF") && agencyId) return { audience: "agency", recipientId: agencyId, email: session?.user?.email ?? null };
  return null;
}

export async function getMyNotifications(params: { unreadOnly?: boolean; category?: string; search?: string; page?: number }): Promise<{
  ok: boolean; items?: Awaited<ReturnType<typeof listNotifications>>["items"];
  total?: number; unread?: number; categories?: string[]; error?: string;
}> {
  const session = await getServerSession(authOptions);
  const recipient = resolveRecipient(session);
  if (!recipient) return { ok: false, error: "Unauthorized" };
  const result = await listNotifications(recipient, { unreadOnly: params.unreadOnly, category: params.category, search: params.search, limit: 50, offset: ((params.page ?? 1) - 1) * 50 });
  return { ok: true, items: result.items, total: result.total, unread: result.unread, categories: Array.from(NOTIFICATION_CATEGORIES) };
}

export async function markRead(id: string): Promise<{ success: boolean }> {
  const session = await getServerSession(authOptions);
  const recipient = resolveRecipient(session);
  if (!recipient) return { success: false };
  await markNotificationRead(id, recipient);
  return { success: true };
}

export async function markAllRead(): Promise<{ success: boolean }> {
  const session = await getServerSession(authOptions);
  const recipient = resolveRecipient(session);
  if (!recipient) return { success: false };
  await markAllNotificationsRead(recipient);
  return { success: true };
}

export async function archiveOne(id: string): Promise<{ success: boolean }> {
  const session = await getServerSession(authOptions);
  const recipient = resolveRecipient(session);
  if (!recipient) return { success: false };
  await archiveNotification(id, recipient);
  return { success: true };
}

export async function deleteOne(id: string): Promise<{ success: boolean }> {
  const session = await getServerSession(authOptions);
  const recipient = resolveRecipient(session);
  if (!recipient) return { success: false };
  await deleteNotification(id, recipient);
  return { success: true };
}

export async function getMyUnreadCount(): Promise<number> {
  const session = await getServerSession(authOptions);
  const recipient = resolveRecipient(session);
  if (!recipient) return 0;
  return getUnreadCountCached(recipient);
}

export async function getMyNotificationPreferences(): Promise<{ ok: boolean; prefs?: Record<string, string>; categories?: string[]; error?: string }> {
  const session = await getServerSession(authOptions);
  const recipient = resolveRecipient(session);
  if (!recipient) return { ok: false, error: "Unauthorized" };
  return { ok: true, prefs: await getPreferences(recipient), categories: Array.from(NOTIFICATION_CATEGORIES) };
}

export async function saveNotificationPreference(category: string, channel: string): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  const recipient = resolveRecipient(session);
  if (!recipient) return { success: false, error: "Unauthorized" };
  try {
    await setPreference(recipient, category, channel);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

/** Phase 14/17 — super admin communication center. */
export async function getCommunicationCenterData(): Promise<{ ok: boolean; health?: Awaited<ReturnType<typeof getCommunicationHealth>>; history?: Awaited<ReturnType<typeof getCommunicationHistory>>; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") return { ok: false, error: "Unauthorized" };
  const [health, history] = await Promise.all([getCommunicationHealth(), getCommunicationHistory({ limit: 50 })]);
  return { ok: true, health, history };
}

export async function retryCommunications(): Promise<{ success: boolean; retried?: number; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") return { success: false, error: "Unauthorized" };
  const result = await retryFailedCommunications(50);
  return { success: true, retried: result.retried };
}
