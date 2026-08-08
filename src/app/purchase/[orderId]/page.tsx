import { getCustomerOrder } from "@/actions/customer-orders.actions";
import { ShippingForm } from "../_components/shipping-form";
import { DownloadCard } from "../_components/download-card";
import { statusLabel } from "@/modules/fulfillment";
import { Package, Truck, Receipt, Mail } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params, searchParams }: { params: { orderId: string }; searchParams: { email?: string } }) {
  const email = searchParams.email ?? "";
  const data = await getCustomerOrder(params.orderId, email);

  if (!data.ok || !data.order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-400">Order not found</p>
          <p className="mt-1 text-sm text-zinc-500">Check the order ID and the email used at checkout.</p>
          <a href="/purchase" className="mt-4 inline-block text-sm text-cyan-400 hover:underline">← Try again</a>
        </div>
      </main>
    );
  }

  const { order } = data;
  const f = order.fulfillment;
  const isPhysical = f?.type === "physical";

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <a href="/purchase" className="text-xs text-zinc-500 hover:text-zinc-300">← Back to order lookup</a>
        <h1 className="mt-3 text-2xl font-bold font-display">Order {order.id.slice(0, 10)}</h1>
        <p className="mt-1 text-sm text-zinc-500">Placed {new Date(order.createdAt).toLocaleDateString()}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><Package className="h-3.5 w-3.5 text-cyan-400" /> Item</p>
            <p className="mt-1 text-sm text-zinc-300">{order.productName}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{formatCurrency(order.amount)} · {order.status}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><Truck className="h-3.5 w-3.5 text-emerald-400" /> Fulfillment</p>
            {f ? (
              <>
                <p className="mt-1 text-sm text-zinc-300 capitalize">{statusLabel(f.status)}</p>
                {f.trackingNumber && <p className="mt-0.5 text-xs text-zinc-500">Tracking: {f.trackingNumber} · {f.courier}</p>}
                {f.carrierNotes && <p className="mt-0.5 text-xs text-zinc-500">{f.carrierNotes}</p>}
              </>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">Processing…</p>
            )}
          </div>
        </div>

        {/* Download */}
        {f && (f.type === "digital" || f.type === "course") && (
          <DownloadCard orderId={order.id} email={email} ready={f.downloadReady} limitReached={f.downloadCount >= f.downloadLimit} />
        )}

        {/* Shipping (physical) */}
        {isPhysical && (
          <ShippingForm orderId={order.id} existing={order.shipping ?? undefined} />
        )}

        {/* Receipt */}
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-white"><Receipt className="h-3.5 w-3.5 text-violet-400" /> Receipt</p>
          <div className="mt-2 space-y-1 text-xs text-zinc-400">
            <div className="flex justify-between"><span>{order.productName}</span><span>{formatCurrency(order.amount)}</span></div>
            <div className="flex justify-between border-t border-white/5 pt-1"><span className="font-semibold text-zinc-300">Total paid</span><span className="font-semibold text-white">{formatCurrency(order.amount)}</span></div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
          <Mail className="h-3.5 w-3.5" /> Questions? Contact the creator at the store you purchased from.
        </div>
      </div>
    </main>
  );
}
