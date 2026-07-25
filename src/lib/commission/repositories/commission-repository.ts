import { prisma } from "@/lib/prisma";
import type { CommissionRule, CommissionEntry } from "../types";
async function tryDb<T>(fn: () => Promise<T>, fallback: T): Promise<T> { try { return await fn(); } catch { return fallback; } }

export class CommissionRepository {
  async saveRule(rule: CommissionRule): Promise<void> {
    await tryDb(async () => {
      await prisma.commissionRule.upsert({
        where: { id: rule.id },
        update: { status: rule.status, platformSharePercent: rule.platformSharePercent, partnerSharePercent: rule.partnerSharePercent, effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null },
        create: { id: rule.id, type: rule.type, status: rule.status, partnerId: rule.partnerId, platformSharePercent: rule.platformSharePercent, partnerSharePercent: rule.partnerSharePercent, effectiveFrom: new Date(rule.effectiveFrom), effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null, priority: rule.priority, label: rule.label, description: rule.description, metadata: rule.metadata ?? {} },
      });
    }, undefined);
  }

  async removeRule(ruleId: string): Promise<boolean> {
    return tryDb(async () => { const r = await prisma.commissionRule.deleteMany({ where: { id: ruleId } }); return r.count > 0; }, false);
  }

  async getRule(ruleId: string): Promise<CommissionRule | undefined> {
    return tryDb(async () => { const r = await prisma.commissionRule.findUnique({ where: { id: ruleId } }); return r ? this.ruleToDomain(r) : undefined; }, undefined);
  }

  async listRules(): Promise<CommissionRule[]> {
    return tryDb(async () => { const r = await prisma.commissionRule.findMany({ orderBy: { priority: "asc" } }); return r.map((x) => this.ruleToDomain(x)); }, []);
  }

  async saveEntry(entry: CommissionEntry): Promise<void> {
    await tryDb(async () => {
      await prisma.commissionEntry.create({
        data: { id: entry.id, invoiceId: entry.invoiceId, partnerId: entry.partnerId, subscriptionId: entry.subscriptionId, planCode: entry.planCode, amount: entry.amount.gross, platformShare: entry.amount.platformShare, partnerShare: entry.amount.partnerShare, platformPercent: entry.amount.platformPercent, partnerPercent: entry.amount.partnerPercent, entryType: entry.type, status: entry.status, description: entry.description, ruleId: entry.ruleId, parentEntryId: entry.parentEntryId, clearedAt: entry.clearedAt ? new Date(entry.clearedAt) : null, reversedAt: entry.reversedAt ? new Date(entry.reversedAt) : null, audit: JSON.parse(JSON.stringify(entry.audit)) },
      });
    }, undefined);
  }

  async getEntriesByPartner(partnerId: string): Promise<CommissionEntry[]> {
    return tryDb(async () => { const r = await prisma.commissionEntry.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } }); return r.map((x) => this.entryToDomain(x)); }, []);
  }

  async getEntriesByInvoice(invoiceId: string): Promise<CommissionEntry[]> {
    return tryDb(async () => { const r = await prisma.commissionEntry.findMany({ where: { invoiceId }, orderBy: { createdAt: "desc" } }); return r.map((x) => this.entryToDomain(x)); }, []);
  }

  async updateEntryStatus(entryId: string, status: string, extra?: Record<string, Date>): Promise<boolean> {
    return tryDb(async () => {
      const data: Record<string, unknown> = { status };
      if (extra?.clearedAt) data.clearedAt = extra.clearedAt;
      if (extra?.reversedAt) data.reversedAt = extra.reversedAt;
      const r = await prisma.commissionEntry.updateMany({ where: { id: entryId }, data });
      return r.count > 0;
    }, false);
  }

  async getAllEntries(): Promise<CommissionEntry[]> {
    return tryDb(async () => { const r = await prisma.commissionEntry.findMany({ orderBy: { createdAt: "desc" } }); return r.map((x) => this.entryToDomain(x)); }, []);
  }

  private ruleToDomain(r: { id: string; type: string; status: string; partnerId: string | null; platformSharePercent: number; partnerSharePercent: number; effectiveFrom: Date; effectiveTo: Date | null; priority: number; label: string; description: string | null; metadata: unknown; createdAt: Date }): CommissionRule {
    return { id: r.id, type: r.type as CommissionRule["type"], status: r.status as CommissionRule["status"], partnerId: r.partnerId ?? undefined, platformSharePercent: r.platformSharePercent, partnerSharePercent: r.partnerSharePercent, effectiveFrom: r.effectiveFrom.toISOString(), effectiveTo: r.effectiveTo?.toISOString(), priority: r.priority, label: r.label, description: r.description ?? undefined, metadata: r.metadata as Record<string, string> | undefined, createdAt: r.createdAt.toISOString() };
  }

  private entryToDomain(e: { id: string; invoiceId: string; partnerId: string; subscriptionId: string | null; planCode: string; amount: number; platformShare: number; partnerShare: number; platformPercent: number; partnerPercent: number; entryType: string; status: string; description: string | null; ruleId: string | null; parentEntryId: string | null; clearedAt: Date | null; reversedAt: Date | null; audit: unknown; createdAt: Date }): CommissionEntry {
    return { id: e.id, invoiceId: e.invoiceId, partnerId: e.partnerId, subscriptionId: e.subscriptionId ?? "", planCode: e.planCode, amount: { gross: e.amount, platformShare: e.platformShare, partnerShare: e.partnerShare, platformPercent: e.platformPercent, partnerPercent: e.partnerPercent, tax: 0, discount: 0, net: e.amount, currency: "INR" }, ruleId: e.ruleId ?? "", type: e.entryType as CommissionEntry["type"], status: e.status as CommissionEntry["status"], description: e.description ?? "", audit: JSON.parse(JSON.stringify(e.audit)) as CommissionEntry["audit"], parentEntryId: e.parentEntryId ?? undefined, clearedAt: e.clearedAt?.toISOString(), reversedAt: e.reversedAt?.toISOString(), createdAt: e.createdAt.toISOString() };
  }
}

export const commissionRepository = new CommissionRepository();
