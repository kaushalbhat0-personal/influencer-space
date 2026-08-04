import { revenueService } from "@/modules/billing/application/revenue-service";
import { TransactionsClient } from "./_components/transactions-client";

export const dynamic = "force-dynamic";

/**
 * IMPLEMENTATION-39: unified commerce timeline — BillingEvents + Invoices +
 * Payments (subscription, invoice, webhook, order events) merged chronologically.
 */
export default async function TransactionsPage() {
  const data = await revenueService.listUnifiedTransactions({ page: 1, pageSize: 50 });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="mt-1 text-sm text-zinc-400">Unified commerce timeline from Billing v2 events, invoices and payments.</p>
      </div>
      <TransactionsClient initial={data} />
    </div>
  );
}
