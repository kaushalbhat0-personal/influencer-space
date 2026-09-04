"use client";

interface Props {
  price: string;
  onPriceChange: (v: string) => void;
  disabled?: boolean;
}

export function ProductPricingSection({ price, onPriceChange, disabled }: Props) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-white mb-3">Pricing</legend>
      <div>
        <label htmlFor="product-price" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
          Price (₹) <span className="text-red-400">*</span>
        </label>
        <input
          id="product-price"
          value={price}
          onChange={(e) => onPriceChange(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          className="admin-input w-full sm:w-48"
          disabled={disabled}
          required
          placeholder="499"
        />
      </div>
    </fieldset>
  );
}
