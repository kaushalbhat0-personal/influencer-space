// ── Payment Account — Application Runtime ───────────────────
// RCCF-IMPLEMENTATION-74 Phase 1 + 3. The creator's canonical payment account
// and the shared payment-readiness runtime. CreatorStore is never in the money
// flow. Sensitive fields are encrypted at rest.

import { prisma } from "@/lib/prisma";
import { cache as reactCache } from "react";
import { encrypt, decrypt } from "@/lib/crypto";
import { logAction } from "@/lib/audit";
import { runtimeEventBus } from "@/modules/event-runtime";
import { resolveCommerceStrategy } from "@/modules/commerce-strategy";
import { getPaymentProviderAdapter } from "../providers/registry";
import type {
  PaymentAccountData,
  PaymentAccountInput,
  PaymentReadiness,
  PaymentReadinessReport,
} from "../domain/types";

const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

// ── Read (request-cached) ────────────────────────────────────

export async function getPaymentAccount(tenantId: string): Promise<PaymentAccountData | null> {
  const row = await prisma.paymentAccount.findUnique({ where: { tenantId } });
  if (!row) return null;
  return serialize(row);
}

function serialize(row: {
  id: string; tenantId: string; provider: string; displayName: string | null; accountHolderName: string | null;
  merchantName: string | null; upiId: string | null; bankAccountName: string | null; bankAccountNumber: string | null;
  ifsc: string | null; settlementMode: string; status: string; verificationStatus: string; capabilities: unknown;
  providerKeyId: string | null; providerKeySecret: string | null; lastVerifiedAt: Date | null; createdAt: Date; updatedAt: Date;
}): PaymentAccountData {
  return {
    id: row.id,
    tenantId: row.tenantId,
    provider: row.provider as PaymentAccountData["provider"],
    displayName: row.displayName,
    accountHolderName: row.accountHolderName,
    merchantName: row.merchantName,
    upiId: row.upiId,
    bankAccountName: row.bankAccountName,
    hasBankAccountNumber: !!row.bankAccountNumber,
    ifsc: row.ifsc,
    settlementMode: row.settlementMode as PaymentAccountData["settlementMode"],
    status: row.status as PaymentAccountData["status"],
    verificationStatus: row.verificationStatus as PaymentAccountData["verificationStatus"],
    capabilities: (row.capabilities as Record<string, boolean>) ?? {},
    hasProviderKeys: !!row.providerKeyId && !!row.providerKeySecret,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ── Write (encrypted + audited) ──────────────────────────────

export async function savePaymentAccount(tenantId: string, input: PaymentAccountInput, actor: string): Promise<{ success: boolean; account?: PaymentAccountData; error?: string }> {
  try {
    const existing = await prisma.paymentAccount.findUnique({ where: { tenantId } });

    const data: Record<string, unknown> = {
      provider: input.provider ?? "razorpay",
      displayName: input.displayName ?? null,
      accountHolderName: input.accountHolderName ?? null,
      merchantName: input.merchantName ?? null,
      upiId: input.upiId ?? null,
      bankAccountName: input.bankAccountName ?? null,
      ifsc: input.ifsc ?? null,
      settlementMode: input.settlementMode ?? "upi",
      capabilities: (input.capabilities ?? {}) as object,
    };
    if (input.bankAccountNumber) data.bankAccountNumber = encrypt(input.bankAccountNumber);
    if (input.providerKeyId) data.providerKeyId = encrypt(input.providerKeyId);
    if (input.providerKeySecret) data.providerKeySecret = encrypt(input.providerKeySecret);
    if (input.providerKeyId || input.providerKeySecret) {
      data.status = "active";
      data.verificationStatus = "pending";
    }

    const row = existing
      ? await prisma.paymentAccount.update({ where: { tenantId }, data })
      : await prisma.paymentAccount.create({ data: { tenantId, ...data } as never });

    await emitEvent(existing ? "payment.account.updated" : "payment.account.created", tenantId, row.id, { provider: data.provider });
    await logAction(tenantId, existing ? "payment:account-updated" : "payment:account-created", { accountId: row.id, provider: data.provider, by: actor }).catch(() => {});

    return { success: true, account: serialize(row) };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Save failed" };
  }
}

export async function verifyPaymentAccount(tenantId: string, actor: string): Promise<{ success: boolean; verified?: boolean; error?: string }> {
  const row = await prisma.paymentAccount.findUnique({ where: { tenantId } });
  if (!row) return { success: false, error: "No payment account" };

  const adapter = getPaymentProviderAdapter(row.provider);
  if (!adapter) return { success: false, error: "No adapter for provider" };

  const secretId = row.providerKeyId ? decrypt(row.providerKeyId) : null;
  const secretKey = row.providerKeySecret ? decrypt(row.providerKeySecret) : null;
  const result = await adapter.getAccountStatus({ providerKeyId: secretId, providerKeySecret: secretKey });

  // RCCF-69.2 — truthfulness: the adapter reports only that credentials are
  // present and well-formatted ("configured"). It does NOT perform a real
  // provider API verification, so we must never write `verified`. The state is
  // persisted as `configured` and the caller is told verification is not real.
  if (result.success && result.status === "configured") {
    await prisma.paymentAccount.update({
      where: { tenantId },
      data: { verificationStatus: "configured", status: "active" },
    });
    await emitEvent("payment.account.updated", tenantId, row.id, { provider: row.provider });
    await logAction(tenantId, "payment:account-configured", { accountId: row.id, by: actor }).catch(() => {});
    return {
      success: true,
      verified: false,
      error: "Credentials format validated. Provider-side verification is not available for Direct Creator mode yet.",
    };
  }
  await prisma.paymentAccount.update({ where: { tenantId }, data: { verificationStatus: "failed" } });
  return { success: false, error: result.error ?? "Verification failed" };
}

export async function disconnectPaymentAccount(tenantId: string, actor: string): Promise<{ success: boolean; error?: string }> {
  const row = await prisma.paymentAccount.findUnique({ where: { tenantId } });
  if (!row) return { success: false, error: "No payment account" };
  await prisma.paymentAccount.update({ where: { tenantId }, data: { status: "disconnected", verificationStatus: "unverified" } });
  await emitEvent("payment.account.disconnected", tenantId, row.id, { provider: row.provider });
  await logAction(tenantId, "payment:account-disconnected", { accountId: row.id, by: actor }).catch(() => {});
  return { success: true };
}

async function emitEvent(type: "payment.account.created" | "payment.account.updated" | "payment.account.verified" | "payment.account.disconnected", tenantId: string, entityId: string, payload: Record<string, unknown>): Promise<void> {
  await runtimeEventBus.publish({ type, tenantId, entityId, payload, occurredAt: new Date().toISOString() }).catch(() => {});
}

// ── Readiness (Phase 3 — shared by builder, dashboard, checkout, storefront) ──

export const computePaymentReadiness = requestCache(async (tenantId: string): Promise<PaymentReadinessReport> => {
  const [account, strategy] = await Promise.all([
    getPaymentAccount(tenantId),
    resolveCommerceStrategy(tenantId),
  ]);

  const requirements = [
    { key: "strategy", label: "Commerce strategy", met: strategy.id === "PLATFORM_COLLECT" || strategy.id === "DIRECT_CREATOR", severity: "required" as const },
    { key: "provider", label: "Payment provider selected", met: !!account && !!getPaymentProviderAdapter(account.provider), severity: "required" as const },
    { key: "configured", label: "Account configured", met: !!(account && (account.hasProviderKeys || account.upiId || account.bankAccountName)), severity: "required" as const },
    { key: "identity", label: "Account holder identified", met: !!account?.accountHolderName, severity: "required" as const },
    { key: "settlement", label: "Settlement detail provided", met: !!(account && (account.settlementMode === "upi" ? !!account.upiId : !!(account.bankAccountName && account.hasBankAccountNumber && account.ifsc))), severity: "required" as const },
    { key: "verification", label: "Provider verification complete", met: account?.verificationStatus === "verified", severity: "required" as const },
  ];

  // For PLATFORM_COLLECT the creator does not need their own account.
  const needed = strategy.id === "DIRECT_CREATOR" ? requirements : requirements.map((r) => ({ ...r, met: r.key === "strategy" || r.key === "verification" ? true : r.met }));

  const missing = needed.filter((r) => !r.met).map((r) => r.label);
  const readiness: PaymentReadiness = strategy.id === "PLATFORM_COLLECT" ? "ready" : missing.length === 0 ? "ready" : missing.length <= 2 ? "warning" : "blocked";

  return {
    tenantId,
    readiness,
    strategy: strategy.id,
    provider: account?.provider ?? null,
    requirements: needed,
    missing,
  };
});

/** Phase 12 — platform payment health. */
export async function getPaymentHealth(): Promise<{
  total: number;
  connected: number;
  pending: number;
  unverified: number;
  disconnected: number;
  providerDistribution: Array<{ provider: string; count: number }>;
}> {
  const [total, connected, pending, unverified, disconnected, byProvider] = await Promise.all([
    prisma.paymentAccount.count(),
    prisma.paymentAccount.count({ where: { status: "active" } }),
    prisma.paymentAccount.count({ where: { status: "pending" } }),
    prisma.paymentAccount.count({ where: { verificationStatus: { in: ["unverified", "pending", "failed"] } } }),
    prisma.paymentAccount.count({ where: { status: "disconnected" } }),
    prisma.paymentAccount.groupBy({ by: ["provider"], _count: true }),
  ]);
  return {
    total, connected, pending, unverified, disconnected,
    providerDistribution: byProvider.map((p) => ({ provider: p.provider, count: p._count })),
  };
}
