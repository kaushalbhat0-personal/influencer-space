import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { token: string } }) {
  return { title: `Order ${params.token.slice(0, 8)}…` };
}

export default async function GuestOrderPage({ params }: { params: { token: string } }) {
  const token = params.token?.trim();
  if (!token || token.length < 32) notFound();

  let order: Awaited<ReturnType<typeof prisma.productOrder.findUnique>>;
  try {
    order = await (prisma.productOrder.findUnique as (args: unknown) => Promise<Awaited<ReturnType<typeof prisma.productOrder.findUnique>>>)({
      where: { guestToken: token },
      select: {
        id: true,
        amount: true,
        quantity: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        fanEmail: true,
        guestTokenExpiresAt: true,
        tenantId: true,
        productId: true,
        provider: true,
        refundStatus: true,
      },
    } as unknown as never);
  } catch {
    // DB migration pending (quantity/guestToken columns not yet deployed) — treat as not found rather than 500
    notFound();
  }

  if (!order) notFound();
  if (order.guestTokenExpiresAt && new Date(order.guestTokenExpiresAt) < new Date()) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Order link expired</h1>
          <p className="text-sm text-zinc-400">This order status link has expired. Please contact the seller for assistance.</p>
          <Link href="/" className="text-sm text-indigo-400 hover:underline">Back to home</Link>
        </div>
      </main>
    );
  }

  const [product, tenant, fulfillment, shipping] = await Promise.all([
    prisma.product.findUnique({ where: { id: order.productId }, select: { name: true, price: true, type: true } }),
    prisma.tenant.findUnique({ where: { id: order.tenantId }, select: { name: true, subdomain: true } }),
    prisma.orderFulfillment.findUnique({ where: { orderId: order.id }, select: { status: true, trackingNumber: true, courier: true, shippedAt: true, deliveredAt: true, createdAt: true } }),
    prisma.shippingAddress.findUnique({ where: { orderId: order.id }, select: { name: true, phone: true, line1: true, city: true, state: true, pin: true, country: true } }),
  ]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Order Status</h1>
          <p className="mt-2 text-sm text-zinc-500">Track your purchase securely</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">Order ID</p>
              <p className="font-mono text-sm font-medium text-white break-all">{order.id}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${order.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-300" : order.status === "PENDING" ? "bg-amber-500/20 text-amber-300" : "bg-zinc-800 text-zinc-300"}`}>{order.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
            <div>
              <p className="text-xs text-zinc-500">Product</p>
              <p className="text-sm font-medium text-white">{product?.name ?? "Product"}</p>
              <p className="text-xs text-zinc-500">Quantity: {order.quantity ?? 1}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Amount</p>
              <p className="text-sm font-semibold text-white">₹{Number(order.amount).toLocaleString("en-IN")}</p>
              <p className="text-xs text-zinc-500">Payment: {order.status === "COMPLETED" ? "Paid" : "Pending"}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 space-y-2">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Fulfillment</p>
            <p className="text-sm text-white">Status: <span className="font-medium">{fulfillment?.status ?? "pending"}</span></p>
            {fulfillment?.trackingNumber && <p className="text-sm text-white">Tracking: <span className="font-mono">{fulfillment.trackingNumber}</span> {fulfillment.courier ? `via ${fulfillment.courier}` : ""}</p>}
            {fulfillment?.shippedAt && <p className="text-xs text-zinc-500">Shipped: {new Date(fulfillment.shippedAt).toLocaleString()}</p>}
            {fulfillment?.deliveredAt && <p className="text-xs text-zinc-500">Delivered: {new Date(fulfillment.deliveredAt).toLocaleString()}</p>}
          </div>

          {shipping && (
            <div className="pt-4 border-t border-white/5">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Shipping to</p>
              <p className="text-sm text-white">{shipping.name}</p>
              <p className="text-sm text-zinc-400">{shipping.line1}, {shipping.city}, {shipping.state} {shipping.pin}, {shipping.country}</p>
              <p className="text-sm text-zinc-400">{shipping.phone}</p>
            </div>
          )}

          <div className="pt-4 border-t border-white/5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Seller</p>
            <p className="text-sm font-medium text-white">{tenant?.name ?? "Store"}</p>
            {tenant?.subdomain && <p className="text-xs text-zinc-500">{tenant.subdomain} storefront</p>}
          </div>

          <div className="pt-4 border-t border-white/5 text-xs text-zinc-500 space-y-1">
            <p>Created: {new Date(order.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(order.updatedAt).toLocaleString()}</p>
            {order.refundStatus !== "NONE" && <p>Refund: {order.refundStatus}</p>}
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-indigo-400 hover:underline">Back to home</Link>
        </div>
      </div>
    </main>
  );
}
