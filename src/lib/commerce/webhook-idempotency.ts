/**
 * Webhook Idempotency Service v1.0.0
 *
 * Prevents duplicate webhook processing via signature-based deduplication.
 * Stores processed webhook IDs with TTL auto-cleanup.
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function isDuplicateWebhook(
  webhookId: string,
  eventType: string
): Promise<boolean> {
  const existing = await prisma.auditLog.findFirst({
    where: {
      action: `webhook:${eventType}`,
      metadata: { path: ["webhookId"], equals: webhookId },
    },
    select: { id: true },
  });
  return !!existing;
}

export async function markWebhookProcessed(
  webhookId: string,
  eventType: string,
  tenantId?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: tenantId ?? "system",
      action: `webhook:${eventType}`,
      metadata: {
        webhookId,
        processedAt: new Date().toISOString(),
      },
    },
  });
}

export function verifyWebhookTimestamp(
  timestamp: string | null,
  toleranceSeconds = 300
): boolean {
  if (!timestamp) return false;
  const webhookTime = new Date(parseInt(timestamp) * 1000).getTime();
  const now = Date.now();
  const diff = Math.abs(now - webhookTime);
  return diff <= toleranceSeconds * 1000;
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function cleanupStaleWebhooks(): Promise<number> {
  const cutoff = new Date(Date.now() - MAX_AGE_MS);
  const result = await prisma.auditLog.deleteMany({
    where: {
      action: { startsWith: "webhook:" },
      createdAt: { lt: cutoff },
    },
  });
  return result.count;
}
