// ── Payment Account — Application Runtime ───────────────────
// RCCF-IMPLEMENTATION-74 Phase 1 + 3. The creator's canonical payment account
// and the shared payment-readiness runtime. CreatorStore is never in the money
// flow. Sensitive fields are encrypted at rest.

import { prisma } from "@/lib/prisma";
import { cache as reactCache } from "react";
import { encrypt, decrypt } from "@/lib/crypto";
import { logAction } from "@/lib/audit";
import { captureError } from "@/lib/observability/error-tracker";
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

/**
 * RCCF-72.18D.6.2 — REAL provider credential verification with
 * classification-driven persistence.
 * RCCF-72.18D.7.5 — on success the response carries the CANONICAL readiness
 * snapshot (`readiness`) so the creator UI can state "credentials verified"
 * and "account ready / not yet ready" as two distinct, truthful facts.
 */
export async function verifyPaymentAccount(tenantId: string, actor: string): Promise<{ success: boolean; verified?: boolean; readiness?: PaymentReadinessReport; error?: string }> {
  const row = await prisma.paymentAccount.findUnique({ where: { tenantId } });
  if (!row) return { success: false, error: "No payment account" };

  const adapter = getPaymentProviderAdapter(row.provider);
  if (!adapter) return { success: false, error: "No adapter for provider" };

  // RCCF-72.18D.6.2 — decrypt strictly in memory. A decryption failure means
  // OUR stored ciphertext/env is unreadable — it is NEVER proof about the
  // credentials themselves, so persisted verification state is NOT mutated.
  let secretId: string | null = null;
  let secretKey: string | null = null;
  try {
    secretId = row.providerKeyId ? decrypt(row.providerKeyId) : null;
    secretKey = row.providerKeySecret ? decrypt(row.providerKeySecret) : null;
  } catch (err) {
    captureError(err instanceof Error ? err : new Error("credential decrypt failed"), {
      service: "payment-account",
      operation: "verifyDecrypt",
      tenantId,
    });
    return { success: false, error: "Stored credentials could not be decrypted. Please re-save your keys." };
  }

  // Snapshot the row version BEFORE any provider I/O — the optimistic
  // concurrency guard must compare against what we READ, never against a
  // re-evaluated (possibly concurrently rotated) value.
  const readVersion = row.updatedAt;

  const result = await adapter.getAccountStatus({ providerKeyId: secretId, providerKeySecret: secretKey });

  // ── RCCF-72.18D.6.2 — classification-driven persistence ──────────────────
  // verified          → persist `verified` (+ lastVerifiedAt), guarded so a
  //                     credential rotation racing the probe is never marked.
  // credential_failed → PERMANENT provider rejection → persist `failed`.
  // transient/unknown → NO WRITE AT ALL: an outage must never destroy a
  //                     previously valid state, and an unknown answer proves
  //                     nothing. Fail-closed readiness handles the rest.
  if (result.classification === "verified") {
    // Optimistic-concurrency guard on the EXISTING updatedAt column (no new
    // schema field): if keys were re-saved while the provider call was in
    // flight, updatedAt moved and this stale result must NOT attach.
    const applied = await prisma.paymentAccount.updateMany({
      where: { tenantId, status: { not: "disconnected" }, updatedAt: readVersion },
      data: { verificationStatus: "verified", lastVerifiedAt: new Date(), status: "active" },
    });
    if (applied.count === 0) {
      return { success: false, error: "Credentials changed during verification. Please verify again." };
    }
    await emitEvent("payment.account.updated", tenantId, row.id, { provider: row.provider });
    await logAction(tenantId, "payment:account-provider-verified", { accountId: row.id, by: actor }).catch(() => {});
    // ── RCCF-72.18D.7.5 ────────────────────────────────────────────────────────
    // The production defect: the UI said "credentials verified" while storefront
    // checkout answered "Creator payment account not ready". Both were TRUE —
    // verification proves only the key pair authenticates; readiness ALSO
    // requires holder identity and settlement details. Close the communication
    // boundary by returning the CANONICAL readiness snapshot alongside the
    // verdict so the creator sees exactly what still blocks storefront payments.
    // Readiness is never hand-rolled here — computePaymentReadiness stays the
    // single authority (request-cached; no extra provider calls).
    const readiness = await computePaymentReadiness(tenantId);
    return { success: true, verified: true, readiness };
  }

  if (result.classification === "credential_failed") {
    const applied = await prisma.paymentAccount
      .updateMany({
        where: { tenantId, updatedAt: readVersion },
        data: { verificationStatus: "failed" },
      })
      .catch(() => ({ count: 0 }));
    if (applied.count > 0) {
      await emitEvent("payment.account.updated", tenantId, row.id, { provider: row.provider });
      await logAction(tenantId, "payment:account-provider-failed", { accountId: row.id, by: actor }).catch(() => {});
    }
    return { success: false, error: result.error ?? "Provider rejected these credentials" };
  }

  // transient | unknown | legacy adapters without a classification.
  if (result.classification === "unknown") {
    captureError(new Error(result.error ?? "unexpected provider verification answer"), {
      service: "payment-account",
      operation: "verifyUnknown",
      tenantId,
    });
  }
  return { success: false, error: result.error ?? "Verification could not be completed. Try again shortly." };
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
    // RCCF-72.18D.6.2 — the verification requirement is now REAL provider
    // verification (`verified`), not format validation (`configured`).
    // Fail-closed: configured/pending/failed/unverified accounts stay blocked.
    { key: "verification", label: "Provider credentials verified", met: account?.verificationStatus === "verified", severity: "required" as const },
  ];

  // For PLATFORM_COLLECT the creator does not need their own account.
  // For DIRECT_CREATOR, only provider-API-verified credentials establish
  // eligibility (RCCF-72.18D.6.2). This is per-tenant readiness ONLY — the
  // DIRECT_CREATOR strategy itself remains `future` in the canonical registry;
  // activation is a separate, explicitly authorized RCCF.
  const needed = strategy.id === "DIRECT_CREATOR"
    ? requirements.map((r) => r.key === "verification" ? { ...r, met: account?.verificationStatus === "verified" } : r)
    : requirements;

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
