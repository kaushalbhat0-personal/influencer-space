import { BuyNowButton } from "@/app/[domain]/_components/buy-now-button";
import type { PublicProductData } from "@/services/public.service";

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function PreviewBuyButton() {
  return (
    <button
      disabled
      className="mt-1.5 w-full rounded-lg bg-white/10 py-2 text-xs font-semibold text-white opacity-50"
    >
      Buy Now
    </button>
  );
}

function EmptyProducts() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-12">
      <svg className="mb-3 h-10 w-10 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <p className="text-sm font-medium text-zinc-600">Your store is empty</p>
      <p className="mt-1 text-xs text-zinc-700">Add products to start selling merchandise</p>
    </div>
  );
}

export function ProductGrid({
  products,
  preview = false,
  themeColor = "#00f5ff",
}: {
  products: PublicProductData[];
  preview?: boolean;
  themeColor?: string;
}) {
  if (products.length === 0) {
    return preview ? <EmptyProducts /> : null;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((product) => (
        <div
          key={product.id}
          className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition-all hover:border-white/20"
        >
          {product.imageUrl && (
            <div className="aspect-square w-full overflow-hidden bg-zinc-800">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}
          <div className="space-y-1.5 p-3">
            <p className="line-clamp-1 text-sm font-medium text-white">
              {product.name}
            </p>
            {product.description && (
              <p className="line-clamp-2 text-xs text-zinc-500">
                {product.description}
              </p>
            )}
            <p className="font-display text-base font-bold text-[var(--secondary)]">
              {formatINR(product.price)}
            </p>
            {preview ? (
              <PreviewBuyButton />
            ) : (
              <BuyNowButton
                productId={product.id}
                productName={product.name}
                imageUrl={product.imageUrl}
                themeColor={themeColor}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
