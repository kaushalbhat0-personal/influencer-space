import type { BillingInvoice, BillingLineItem } from "./types";
import { DEFAULT_CURRENCY } from "./constants";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils";

export function mapInvoice(inv: Record<string, unknown>): BillingInvoice {
  return {
    id: inv.id as string,
    accountId: inv.accountId as string,
    planCode: (inv.planCode as string) ?? "creator_launch",
    planName: "",
    amount: (inv.amount as number) ?? 0,
    taxAmount: (inv.taxAmount as number) ?? 0,
    total: ((inv.amount as number) ?? 0) + ((inv.taxAmount as number) ?? 0),
    currency: (inv.currency as string) ?? DEFAULT_CURRENCY,
    status: inv.status as BillingInvoice["status"],
    issuedAt: fmtDate(inv.issuedAt) ?? "",
    paidAt: fmtDate(inv.paidAt),
    dueAt: fmtDate(inv.dueAt),
    invoiceUrl: (inv.invoiceUrl as string) ?? null,
    provider: (inv.provider as string) ?? null,
    providerReference: (inv.providerReference as string) ?? null,
    lineItems: parseLineItems(inv.lineItems),
  };
}

function fmtDate(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof (v as Record<string, unknown>).toISOString === "function") {
    return (v as Date).toISOString();
  }
  return String(v);
}

function parseLineItems(lineItems: unknown): BillingLineItem[] {
  if (!lineItems) return [];
  if (typeof lineItems === "string") {
    try { return JSON.parse(lineItems); } catch { return []; }
  }
  if (Array.isArray(lineItems)) return lineItems as BillingLineItem[];
  return [];
}

export function formatCurrency(amount: number, currency = DEFAULT_CURRENCY): string {
  return formatCurrencyUtil(amount, currency);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(dateStr));
}

const INVOICE_STATUS_LABELS: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
  PAID: { label: "Paid", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  OVERDUE: { label: "Overdue", variant: "danger" },
  CANCELLED: { label: "Cancelled", variant: "default" },
  REFUNDED: { label: "Refunded", variant: "info" },
};

export function formatInvoiceStatus(status: string): { label: string; variant: "success" | "warning" | "danger" | "info" | "default" } {
  return INVOICE_STATUS_LABELS[status] ?? { label: status, variant: "default" };
}

export function calculateSubtotal(lineItems: BillingLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.amount * item.quantity, 0);
}

export function calculateTax(subtotal: number, taxRatePercent: number): number {
  return Math.round((subtotal * taxRatePercent) / 100);
}

export function calculateTotal(subtotal: number, tax: number, credits = 0): number {
  return Math.max(0, subtotal + tax - credits);
}

export function calculateRefund(invoice: BillingInvoice, refundPercent: number): number {
  return Math.round((invoice.total * refundPercent) / 100);
}

export function generateInvoiceNumber(prefix: string, sequential: number): string {
  return `${prefix}-${String(sequential).padStart(6, "0")}`;
}

export function prepareInvoicePdfData(invoice: BillingInvoice): Record<string, unknown> {
  return {
    invoiceNumber: invoice.id,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.amount,
      total: item.amount * item.quantity,
    })),
    subtotal: calculateSubtotal(invoice.lineItems),
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    currency: invoice.currency,
    status: invoice.status,
  };
}
