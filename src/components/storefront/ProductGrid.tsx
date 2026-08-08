import { formatCurrency } from "@/lib/utils";
interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  slug?: string | null;
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) return null;

  return (
    <section id="products" className="py-12">
      <h2 className="text-lg font-bold text-white mb-6">Products</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="group rounded-xl border border-white/[0.06] bg-[var(--surface-base)]/30 overflow-hidden hover:border-white/20 transition-all"
          >
            {/* Image or placeholder */}
            <div className="aspect-[4/3] bg-[var(--brand-primary,#6366F1)]/10 flex items-center justify-center overflow-hidden">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <span className="text-3xl font-bold text-white/10">{p.name.charAt(0)}</span>
              )}
            </div>

            <div className="p-4">
              <h3 className="text-sm font-semibold text-white">{p.name}</h3>
              {p.description && <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{p.description}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm font-bold text-white">{formatCurrency(p.price)}</span>
                <a
                  href={`/checkout?product=${p.id}`}
                  className="rounded-lg bg-[var(--brand-secondary,#00f5ff)] px-4 py-1.5 text-xs font-semibold text-black transition-colors hover:opacity-90"
                >
                  Buy Now
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
