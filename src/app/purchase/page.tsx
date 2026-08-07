import { OrderLookup } from "./_components/order-lookup";

export const metadata = { title: "Track Your Order — CreatorStore" };

export default function PurchasePage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-16 text-white">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold font-display">Track Your Order</h1>
        <p className="mt-2 text-sm text-zinc-500">Enter your order ID to see status, tracking and downloads.</p>
        <OrderLookup />
        <p className="mt-6 text-xs text-zinc-600">
          Bought from a creator? Your receipt is available right here once you&apos;ve verified your email.
        </p>
      </div>
    </main>
  );
}
