import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { CommissionRule, CommissionEntry } from "../types";
import { InfrastructureError } from "@/lib/errors/infrastructure-error";

export class CommissionRepository {
  private client(tx?: Prisma.TransactionClient) {
    return tx ?? prisma;
  }

  async saveRule(rule: CommissionRule, tx?: Prisma.TransactionClient): Promise<void> {
    try {
      await this.client(tx).commissionRule.upsert({
        where: { id: rule.id },
        update: {
          status: rule.status,
          platformSharePercent: rule.platformSharePercent,
          partnerSharePercent: rule.partnerSharePercent,
          effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null,
        },
        create: {
          id: rule.id, type: rule.type, status: rule.status, partnerId: rule.partnerId,
          platformSharePercent: rule.platformSharePercent, partnerSharePercent: rule.partnerSharePercent,
          effectiveFrom: new Date(rule.effectiveFrom),
          effectiveTo: rule.effectiveTo ? new Date(rule.effectiveTo) : null,
          priority: rule.priority, label: rule.label, description: rule.description,
          metadata: rule.metadata ?? {},
        },
      });
    } catch (err) {
      throw new InfrastructureError("CommissionRepository.saveRule", `Failed to save rule ${rule.id}`, err);
    }
  }

  async removeRule(ruleId: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    try {
      const r = await this.client(tx).commissionRule.deleteMany({ where: { id: ruleId } });
      return r.count > 0;
    } catch (err) {
      throw new InfrastructureError("CommissionRepository.removeRule", `Failed to remove rule ${ruleId}`, err);
    }
  }

  async getRule(ruleId: string, tx?: Prisma.TransactionClient): Promise<CommissionRule | undefined> {
    try {
      const r = await this.client(tx).commissionRule.findUnique({ where: { id: ruleId } });
      return r ? this.ruleToDomain(r) : undefined;
    } catch (err) {
      throw new InfrastructureError("CommissionRepository.getRule", `Failed to get rule ${ruleId}`, err);
    }
  }

  async listRules(tx?: Prisma.TransactionClient): Promise<CommissionRule[]> {
    try {
      const r = await this.client(tx).commissionRule.findMany({ orderBy: { priority: "asc" } });
      return r.map((x) => this.ruleToDomain(x));
    } catch (err) {
      throw new InfrastructureError("CommissionRepository.listRules", "Failed to list rules", err);
    }
  }

  async saveEntry(entry: CommissionEntry, tx?: Prisma.TransactionClient): Promise<void> {
    try {
      await this.client(tx).commissionEntry.create({
        data: {
          id: entry.id, invoiceId: entry.invoiceId, partnerId: entry.partnerId,
          subscriptionId: entry.subscriptionId, planCode: entry.planCode,
          amount: entry.amount.gross, platformShare: entry.amount.platformShare,
          partnerShare: entry.amount.partnerShare, platformPercent: entry.amount.platformPercent,
          partnerPercent: entry.amount.partnerPercent, entryType: entry.type, status: entry.status,
          description: entry.description, ruleId: entry.ruleId, parentEntryId: entry.parentEntryId,
          clearedAt: entry.clearedAt ? new Date(entry.clearedAt) : null,
          reversedAt: entry.reversedAt ? new Date(entry.reversedAt) : null,
          audit: JSON.parse(JSON.stringify(entry.audit)),
        },
      });
    } catch (err) {
      throw new InfrastructureError("CommissionRepository.saveEntry", `Failed to save entry ${entry.id}`, err);
    }
  }

  async getEntriesByPartner(partnerId: string, tx?: Prisma.TransactionClient): Promise<CommissionEntry[]> {
    try {
      const r = await this.client(tx).commissionEntry.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } });
      return r.map((x) => this.entryToDomain(x));
    } catch (err) {
      throw new InfrastructureError("CommissionRepository.getEntriesByPartner", `Failed to get entries for partner ${partnerId}`, err);
    }
  }

  async getEntriesByInvoice(invoiceId: string, tx?: Prisma.TransactionClient): Promise<CommissionEntry[]> {
    try {
      const r = await this.client(tx).commissionEntry.findMany({ where: { invoiceId }, orderBy: { createdAt: "desc" } });
      return r.map((x) => this.entryToDomain(x));
    } catch (err) {
      throw new InfrastructureError("CommissionRepository.getEntriesByInvoice", `Failed to get entries for invoice ${invoiceId}`, err);
    }
  }

  async updateEntryStatus(entryId: string, status: string, extra?: Record<string, Date>, tx?: Prisma.TransactionClient): Promise<boolean> {
    try {
      const data: Record<string, unknown> = { status };
      if (extra?.clearedAt) data.clearedAt = extra.clearedAt;
      if (extra?.reversedAt) data.reversedAt = extra.reversedAt;
      const r = await this.client(tx).commissionEntry.updateMany({ where: { id: entryId }, data });
      return r.count > 0;
    } catch (err) {
      throw new InfrastructureError("CommissionRepository.updateEntryStatus", `Failed to update entry ${entryId} status`, err);
    }
  }

  async getAllEntries(tx?: Prisma.TransactionClient): Promise<CommissionEntry[]> {
    try {
      const r = await this.client(tx).commissionEntry.findMany({ orderBy: { createdAt: "desc" } });
      return r.map((x) => this.entryToDomain(x));
    } catch (err) {
      throw new InfrastructureError("CommissionRepository.getAllEntries", "Failed to get all entries", err);
    }
  }

  private ruleToDomain(r: {
    id: string; type: string; status: string; partnerId: string | null;
    platformSharePercent: number; partnerSharePercent: number; effectiveFrom: Date;
    effectiveTo: Date | null; priority: number; label: string; description: string | null;
    metadata: unknown; createdAt: Date;
  }): CommissionRule {
    return {
      id: r.id, type: r.type as CommissionRule["type"], status: r.status as CommissionRule["status"],
      partnerId: r.partnerId ?? undefined,
      platformSharePercent: r.platformSharePercent, partnerSharePercent: r.partnerSharePercent,
      effectiveFrom: r.effectiveFrom.toISOString(), effectiveTo: r.effectiveTo?.toISOString(),
      priority: r.priority, label: r.label, description: r.description ?? undefined,
      metadata: r.metadata as Record<string, string> | undefined,
      createdAt: r.createdAt.toISOString(),
    };
  }

  private entryToDomain(e: {
    id: string; invoiceId: string; partnerId: string; subscriptionId: string | null;
    planCode: string; amount: number; platformShare: number; partnerShare: number;
    platformPercent: number; partnerPercent: number; entryType: string; status: string;
    description: string | null; ruleId: string | null; parentEntryId: string | null;
    clearedAt: Date | null; reversedAt: Date | null; audit: unknown; createdAt: Date;
  }): CommissionEntry {
    return {
      id: e.id, invoiceId: e.invoiceId, partnerId: e.partnerId, subscriptionId: e.subscriptionId ?? "",
      planCode: e.planCode,
      amount: {
        gross: e.amount, platformShare: e.platformShare, partnerShare: e.partnerShare,
        platformPercent: e.platformPercent, partnerPercent: e.partnerPercent, tax: 0, discount: 0,
        net: e.amount, currency: "INR",
      },
      ruleId: e.ruleId ?? "", type: e.entryType as CommissionEntry["type"],
      status: e.status as CommissionEntry["status"], description: e.description ?? "",
      audit: JSON.parse(JSON.stringify(e.audit)) as CommissionEntry["audit"],
      parentEntryId: e.parentEntryId ?? undefined, clearedAt: e.clearedAt?.toISOString(),
      reversedAt: e.reversedAt?.toISOString(), createdAt: e.createdAt.toISOString(),
    };
  }
}

export const commissionRepository = new CommissionRepository();
