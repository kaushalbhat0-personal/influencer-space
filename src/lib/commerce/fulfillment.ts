/**
 * Digital Fulfillment Service v1.0.0
 *
 * Manages download permissions, token generation, and access expiry
 * for digital product purchases.
 */

import { logAction } from "@/lib/audit";
import crypto from "crypto";

export interface DownloadPermission {
  orderId: string;
  productId: string;
  fanEmail: string;
  token: string;
  expiresAt: Date;
  maxDownloads: number;
  downloadCount: number;
}

export async function generateDownloadToken(
  orderId: string,
  productId: string,
  fanEmail: string,
  validityHours = 72,
  maxDownloads = 5
): Promise<DownloadPermission> {
  const token = crypto.randomBytes(32).toString("hex");

  await logAction("system", "fulfillment:token:created", {
    orderId,
    productId,
    fanEmail,
    tokenPrefix: token.slice(0, 8),
    expiresAt: new Date(Date.now() + validityHours * 60 * 60 * 1000).toISOString(),
  });

  return {
    orderId,
    productId,
    fanEmail,
    token,
    expiresAt: new Date(Date.now() + validityHours * 60 * 60 * 1000),
    maxDownloads,
    downloadCount: 0,
  };
}

export function isValidDownloadToken(
  permission: DownloadPermission
): { valid: boolean; reason?: string } {
  if (permission.downloadCount >= permission.maxDownloads) {
    return { valid: false, reason: "Download limit reached" };
  }
  if (new Date() > permission.expiresAt) {
    return { valid: false, reason: "Download link expired" };
  }
  return { valid: true };
}

export async function recordDownload(
  orderId: string
): Promise<void> {
  await logAction("system", "fulfillment:download", { orderId });
}
