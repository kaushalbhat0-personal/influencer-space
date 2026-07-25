import type { CommissionEntry, PartnerBalance, BalanceTransaction, AuditMetadata } from "./types";
import type { LedgerEntryType } from "./constants";
import { CALCULATION_VERSION } from "./constants";
import { commissionRepository } from "./repositories/commission-repository";

export class CommissionLedger {
  private entries: CommissionEntry[] = [];
  private balanceTransactions: BalanceTransaction[] = [];
  private initialized = false;

  async initialize(): Promise<{ entries: number }> {
    if (this.initialized) return { entries: this.entries.length };
    this.entries = await commissionRepository.getAllEntries();
    for (const e of this.entries) this.indexBalanceTransaction(e);
    this.initialized = true;
    return { entries: this.entries.length };
  }

  addEntry(entry: CommissionEntry): void {
    this.entries.push(entry);
    this.indexBalanceTransaction(entry);
  }

  getEntry(entryId: string): CommissionEntry | undefined {
    return this.entries.find((e) => e.id === entryId);
  }

  getEntriesByInvoice(invoiceId: string): CommissionEntry[] {
    return this.entries.filter((e) => e.invoiceId === invoiceId);
  }

  getEntriesByPartner(partnerId: string): CommissionEntry[] {
    return this.entries.filter((e) => e.partnerId === partnerId);
  }

  queryEntries(params: {
    partnerId?: string;
    invoiceId?: string;
    type?: LedgerEntryType;
    status?: CommissionEntry["status"];
    createdAfter?: string;
    createdBefore?: string;
    limit?: number;
    offset?: number;
  }): { items: CommissionEntry[]; total: number; hasMore: boolean } {
    let result = [...this.entries];
    if (params.partnerId) result = result.filter((e) => e.partnerId === params.partnerId);
    if (params.invoiceId) result = result.filter((e) => e.invoiceId === params.invoiceId);
    if (params.type) result = result.filter((e) => e.type === params.type);
    if (params.status) result = result.filter((e) => e.status === params.status);
    if (params.createdAfter) result = result.filter((e) => new Date(e.createdAt) > new Date(params.createdAfter!));
    if (params.createdBefore) result = result.filter((e) => new Date(e.createdAt) < new Date(params.createdBefore!));
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = result.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;
    const items = result.slice(offset, offset + limit);
    return { items, total, hasMore: offset + limit < total };
  }

  reverseEntry(entryId: string, reason: string): CommissionEntry | null {
    const original = this.entries.find((e) => e.id === entryId);
    if (!original) return null;
    if (original.status === "reversed") return null;

    const reversedEntry: CommissionEntry = {
      ...original,
      id: `${entryId}_reversal`,
      type: "reversal",
      status: "cleared",
      description: `Reversal: ${reason}`,
      parentEntryId: entryId,
      createdAt: new Date().toISOString(),
    };

    this.entries.push(reversedEntry);
    original.status = "reversed";
    original.reversedAt = new Date().toISOString();

    this.balanceTransactions.push({
      id: `bt_${reversedEntry.id}`,
      partnerId: original.partnerId,
      entryId: reversedEntry.id,
      amount: -original.amount.partnerShare,
      type: "paid",
      description: `Reversal of ${entryId}: ${reason}`,
      createdAt: reversedEntry.createdAt,
    });

    return reversedEntry;
  }

  getBalance(partnerId: string): PartnerBalance {
    const partnerEntries = this.entries.filter((e) => e.partnerId === partnerId);
    let pending = 0;
    let available = 0;
    let paid = 0;
    let lifetime = 0;

    for (const entry of partnerEntries) {
      if (entry.status === "reversed") continue;
      if (entry.type === "reversal") {
        paid -= entry.amount.partnerShare;
        continue;
      }
      lifetime += entry.amount.partnerShare;
      if (entry.status === "pending") {
        pending += entry.amount.partnerShare;
      } else if (entry.status === "cleared") {
        available += entry.amount.partnerShare;
      }
    }

    return {
      partnerId,
      pending,
      available,
      paid,
      lifetime,
      currency: partnerEntries[0]?.amount.currency ?? "INR",
      lastUpdated: new Date().toISOString(),
    };
  }

  clearEntry(entryId: string): boolean {
    const entry = this.entries.find((e) => e.id === entryId);
    if (!entry || entry.status !== "pending") return false;
    entry.status = "cleared";
    entry.clearedAt = new Date().toISOString();
    return true;
  }

  buildAudit(params: {
    ruleId: string;
    ruleType: CommissionEntry["audit"]["ruleType"];
    platformPercent: number;
    partnerPercent: number;
    invoiceId: string;
    partnerId: string;
  }): AuditMetadata {
    return {
      calculationVersion: CALCULATION_VERSION,
      ruleUsed: params.ruleId,
      ruleType: params.ruleType,
      platformPercent: params.platformPercent,
      partnerPercent: params.partnerPercent,
      invoiceReference: params.invoiceId,
      partnerReference: params.partnerId,
      calculatedAt: new Date().toISOString(),
    };
  }

  getAllEntries(): CommissionEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
    this.balanceTransactions = [];
  }

  private indexBalanceTransaction(entry: CommissionEntry): void {
    if (entry.type === "reversal") return;
    this.balanceTransactions.push({
      id: `bt_${entry.id}`,
      partnerId: entry.partnerId,
      entryId: entry.id,
      amount: entry.amount.partnerShare,
      type: "pending",
      description: entry.description,
      createdAt: entry.createdAt,
    });
  }
}

export const commissionLedger = new CommissionLedger();
