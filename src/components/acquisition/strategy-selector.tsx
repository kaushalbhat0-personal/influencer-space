"use client";

import { acquisitionRegistry } from "@/lib/acquisition";
import { StrategyCard } from "./strategy-card";

export function StrategySelector({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const strategies = acquisitionRegistry.getAll();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Choose Acquisition Strategy</h2>
        <p className="mt-1 text-sm text-zinc-400">
          How would you like to create this storefront?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {strategies.map((adapter) => (
          <StrategyCard
            key={adapter.id}
            adapter={adapter}
            active={selected === adapter.id}
            onClick={() => onSelect(adapter.id)}
          />
        ))}
      </div>
    </div>
  );
}
